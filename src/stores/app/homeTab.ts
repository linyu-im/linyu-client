import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { defineStore } from 'pinia'
import { chatApi } from '@/api'
import { SceneType } from '@/constants/common'
import type { SceneType as SceneTypeValue } from '@/constants/common'
import { HOME_TAB_NAVIGATE_EVENT } from '@/constants/event'
import { HOME_WINDOW_LABEL } from '@/constants/window'
import router from '@/router'
import { useChatStore } from '@/stores/chat/chat'

export type HomeTabId = 'message' | 'contacts' | 'moment' | 'ai' | 'drive' | 'application'

export interface HomeTabMessagePayload {
  chatId?: string
  peerId?: string
  sceneType?: SceneTypeValue
}

export interface HomeTabContactsPayload {
  selectedId?: string
  peerId?: string
}

export interface HomeTabAiPayload {
  conversationId?: string
}

type HomeTabBadgeCounts = Record<HomeTabId, number>

type HomeTabPayloadMap = {
  message: HomeTabMessagePayload
  contacts: HomeTabContactsPayload
  moment: Record<string, never>
  ai: HomeTabAiPayload
  drive: Record<string, never>
  application: Record<string, never>
}

export interface HomeTabNavigatePayload {
  tabId: HomeTabId
  payload?: HomeTabPayloadMap[HomeTabId]
}

type HomeTabStore = {
  activeTabId: HomeTabId
  badgeCounts: HomeTabBadgeCounts
  tabPayload: Partial<HomeTabPayloadMap>
}

const TAB_PATHS: Record<HomeTabId, string> = {
  message: '/home/message',
  contacts: '/home/contacts',
  moment: '/home/moment',
  ai: '/home/ai',
  drive: '/home/drive',
  application: '/home/application'
}

const createDefaultBadgeCounts = (): HomeTabBadgeCounts => ({
  message: 0,
  contacts: 0,
  moment: 0,
  ai: 0,
  drive: 0,
  application: 0
})

export const useHomeTabStore = defineStore('homeTab', {
  persist: {
    pick: ['activeTabId']
  },
  share: {
    enable: true,
    initialize: true
  },
  state: (): HomeTabStore => ({
    activeTabId: 'message',
    badgeCounts: createDefaultBadgeCounts(),
    tabPayload: {}
  }),
  actions: {
    setActiveTabId(tabId: HomeTabId) {
      this.$patch((state) => {
        state.activeTabId = tabId
      })
    },

    setBadgeCount(tabId: HomeTabId, count: number) {
      this.$patch((state) => {
        state.badgeCounts[tabId] = Math.max(0, count)
      })
    },

    setBadgeCounts(counts: Partial<HomeTabBadgeCounts>) {
      this.$patch((state) => {
        for (const [tabId, count] of Object.entries(counts) as [HomeTabId, number][]) {
          if (typeof count === 'number') {
            state.badgeCounts[tabId] = Math.max(0, count)
          }
        }
      })
    },

    syncActiveTabFromPath(path: string) {
      const match = (Object.entries(TAB_PATHS) as [HomeTabId, string][]).find(([, tabPath]) => tabPath === path)
      if (!match || this.activeTabId === match[0]) return

      this.$patch((state) => {
        state.activeTabId = match[0]
      })
    },

    setTabPayload<T extends keyof HomeTabPayloadMap>(tabId: T, payload: HomeTabPayloadMap[T]) {
      this.$patch((state) => {
        state.tabPayload[tabId] = payload
      })
    },

    consumeTabPayload<T extends keyof HomeTabPayloadMap>(tabId: T): HomeTabPayloadMap[T] | null {
      const payload = this.tabPayload[tabId]
      if (!payload) return null

      this.$patch((state) => {
        delete state.tabPayload[tabId]
      })

      return payload as HomeTabPayloadMap[T]
    },

    navigateTo(tabId: HomeTabId, payload?: HomeTabPayloadMap[HomeTabId]): Promise<void> | void {
      if (tabId === 'message') {
        const messagePayload = payload as HomeTabMessagePayload | undefined
        if (messagePayload?.peerId) {
          return this.openMessageWithPeer(messagePayload.peerId, messagePayload.sceneType ?? SceneType.User)
        }
        if (messagePayload?.chatId) {
          const chatStore = useChatStore()
          chatStore.markReopen()
          return Promise.resolve(chatStore.setSelectedChatId(messagePayload.chatId)).then(() => {
            this.applyNavigate('message', { chatId: messagePayload.chatId })
          })
        }
      }

      this.applyNavigate(tabId, payload)
    },

    /** 非 home 窗口调用时，通过事件让主窗执行路由跳转 */
    applyNavigate(tabId: HomeTabId, payload?: HomeTabPayloadMap[HomeTabId]): Promise<void> | void {
      if (payload && Object.keys(payload).length > 0) {
        this.setTabPayload(tabId, payload)
      }

      this.$patch((state) => {
        state.activeTabId = tabId
      })

      if (WebviewWindow.getCurrent().label !== HOME_WINDOW_LABEL) {
        const eventPayload: HomeTabNavigatePayload = { tabId, payload }
        return emitTo(HOME_WINDOW_LABEL, HOME_TAB_NAVIGATE_EVENT, eventPayload).then(() => undefined)
      }

      if (router.currentRoute.value.path !== TAB_PATHS[tabId]) {
        return router.push(TAB_PATHS[tabId]).then(() => undefined)
      }
    },

    openMessageWithPeer(peerId: string, sceneType: SceneTypeValue = SceneType.User): Promise<void> {
      const chatStore = useChatStore()

      return chatApi.create({ peerId, sceneType }).then((res) => {
        if (res.code !== 0 || !res.data) {
          window.$message.error(res.msg)
          return
        }

        const chatId = res.data.id
        return chatStore.loadList().then(() => {
          return Promise.resolve(chatStore.setSelectedChatId(chatId)).then(() => {
            chatStore.markReopen()
            this.applyNavigate('message', { chatId })
          })
        })
      })
    },

    openAiConversation(conversationId: string): Promise<void> | void {
      if (!conversationId) return
      return this.navigateTo('ai', { conversationId })
    }
  }
})
