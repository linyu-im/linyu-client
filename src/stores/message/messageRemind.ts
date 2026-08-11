import { SceneType } from '@/constants/common'
import { MESSAGE_REMIND_WINDOW_LABEL } from '@/constants/window'
import i18n from '@/services/i18n'
import { useSessionLockStore } from '@/stores/app/sessionLock'
import { useChatStore } from '@/stores/chat/chat'
import { useUserStore } from '@/stores/user/user'
import type { Message } from '@/types/api/message'
import type { FromType } from '@/types/common'
import { formatCallRecordSummary } from '@/utils/message/callRecord'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/window'
import { defineStore } from 'pinia'

const t = i18n.global.t

/** 托盘离开 → 提醒窗的缓冲；跨窗用 hideSeq 取消，不依赖模块级 timer 引用 */
const HIDE_WINDOW_DELAY_MS = 320
/** 提醒窗底部与托盘轻微重叠，减少移入空隙 */
const TRAY_WINDOW_OVERLAP_PX = 8
const WINDOW_WIDTH = 240
const HEADER_HEIGHT = 32
const ITEM_HEIGHT = 40
const LIST_BOTTOM_PADDING = 8
/** 容器上下 border 各 1px */
const BORDER_HEIGHT = 2
const MAX_VISIBLE_ITEMS = 8

export const MESSAGE_REMIND_ITEM_HEIGHT = ITEM_HEIGHT
export const MESSAGE_REMIND_LIST_BOTTOM_PADDING = LIST_BOTTOM_PADDING

export const calcMessageRemindWindowHeight = (itemCount: number) => {
  const visibleCount = Math.min(Math.max(itemCount, 0), MAX_VISIBLE_ITEMS)
  return HEADER_HEIGHT + visibleCount * ITEM_HEIGHT + LIST_BOTTOM_PADDING + BORDER_HEIGHT
}

export interface MessageRemindItem {
  sessionId: string
  chatId: string
  peerId: string
  peerType: FromType
  name: string
  preview: string
  messageId: string
  updatedAt: string
}

export interface MessageRemindTrayRect {
  position: { x: number; y: number }
  size: { width: number; height: number }
}

type MessageRemindStore = {
  items: MessageRemindItem[]
  windowHovered: boolean
  /** 递增后，旧的隐藏定时器自行失效（跨窗口有效） */
  hideSeq: number
  /** 用户手动取消闪动；有新消息时自动恢复 */
  blinkPaused: boolean
  /** 托盘当前是否应该闪烁，由 store 统一计算 */
  shouldBlink: boolean
  /** 最近一次用于定位的托盘矩形 */
  lastTrayRect: MessageRemindTrayRect | null
}

const formatMessagePreview = (msg: Message): string => {
  switch (msg.msgType) {
    case 'text':
      return msg.content.text || ''
    case 'image':
      return `[${t('message.msgType.image')}]`
    case 'video':
      return `[${t('message.msgType.video')}]`
    case 'file':
      return `[${t('message.msgType.file')}] ${msg.content.fileName || ''}`
    case 'cloud_share': {
      const files = msg.content.files || []
      const firstName = files[0]?.shareName || ''
      const previewName =
        files.length > 1 ? t('message.cloudShare.multiName', { name: firstName, count: files.length }) : firstName
      return `[${t('message.msgType.cloud_share')}] ${previewName}`
    }
    case 'ecard':
      return `[${t('message.msgType.ecard')}] ${msg.content.userName || ''}`
    case 'voice':
      return `[${t('message.msgType.voice')}]`
    case 'sticker':
      return `[${t('message.msgType.sticker')}] ${msg.content.stickerName || ''}`
    case 'call_record':
      return formatCallRecordSummary(msg.content, t, { withType: true })
    default:
      return `[${t('message.msgType.unknown')}]`
  }
}

const resolvePeerType = (sceneType?: string): FromType => {
  if (sceneType === SceneType.Group) return 'group'
  return 'user'
}

const buildRemindItemFromChat = (chat: ReturnType<typeof useChatStore>['chatList'][number]): MessageRemindItem => {
  const lastMsg = chat.lastMsgContent
  const preview = lastMsg ? formatMessagePreview(lastMsg).trim() : ''
  const name = (chat.peerRemark || chat.peerName || '').trim() || chat.peerId
  const updatedAt = lastMsg?.updatedAt || lastMsg?.createdAt || chat.updatedAt || ''

  return {
    sessionId: chat.sessionId,
    chatId: chat.id,
    peerId: chat.peerId,
    peerType: resolvePeerType(chat.sceneType),
    name,
    preview,
    messageId: lastMsg?.id || '',
    updatedAt
  }
}

export const useMessageRemindStore = defineStore('messageRemind', {
  persist: false,
  share: { enable: true, initialize: true },
  state: (): MessageRemindStore => ({
    items: [],
    windowHovered: false,
    hideSeq: 0,
    blinkPaused: false,
    shouldBlink: false,
    lastTrayRect: null
  }),
  actions: {
    syncBlinkState() {
      this.$patch((state) => {
        state.shouldBlink = state.items.length > 0 && !state.blinkPaused
      })
    },

    getUnreadNum(sessionId: string) {
      return useChatStore().chatList.find((item) => item.sessionId === sessionId)?.unreadNum ?? 0
    },

    syncFromChatList() {
      const chatStore = useChatStore()
      const unreadChats = chatStore.chatList.filter((item) => item.unreadNum > 0 && !item.peerIsMute)

      this.$patch((state) => {
        const unreadBySessionId = new Map(unreadChats.map((item) => [item.sessionId, item]))
        const nextItems: MessageRemindItem[] = []

        for (const current of state.items) {
          const chat = unreadBySessionId.get(current.sessionId)
          if (!chat) continue

          nextItems.push({
            ...current,
            chatId: chat.id,
            peerId: chat.peerId,
            peerType: resolvePeerType(chat.sceneType),
            name: (chat.peerRemark || chat.peerName || '').trim() || chat.peerId,
            preview: current.preview || (chat.lastMsgContent ? formatMessagePreview(chat.lastMsgContent).trim() : ''),
            messageId: current.messageId || chat.lastMsgContent?.id || '',
            updatedAt:
              current.updatedAt ||
              chat.lastMsgContent?.updatedAt ||
              chat.lastMsgContent?.createdAt ||
              chat.updatedAt ||
              ''
          })
          unreadBySessionId.delete(current.sessionId)
        }

        for (const chat of unreadChats) {
          if (!unreadBySessionId.has(chat.sessionId)) continue
          nextItems.push(buildRemindItemFromChat(chat))
        }

        state.items = nextItems
        state.shouldBlink = state.items.length > 0 && !state.blinkPaused
      })
    },

    pushFromMessage(msg: Message) {
      if (!msg?.sessionId) return

      const currentUserId = useUserStore().authInfo.userId
      if (!currentUserId || msg.fromId === currentUserId) return

      const chatStore = useChatStore()
      const chat = chatStore.chatList.find((item) => item.sessionId === msg.sessionId)
      if (!chat || chat.peerIsMute) return
      if (chatStore.isChatActive(chat.id)) return

      const preview = formatMessagePreview(msg).trim()
      const name = (chat.peerRemark || chat.peerName || '').trim() || chat.peerId
      const updatedAt = msg.updatedAt || msg.createdAt || ''

      this.$patch((state) => {
        state.blinkPaused = false
        state.shouldBlink = true
        const index = state.items.findIndex((item) => item.sessionId === msg.sessionId)
        if (index === -1) {
          state.items.unshift({
            sessionId: msg.sessionId,
            chatId: chat.id,
            peerId: chat.peerId,
            peerType: resolvePeerType(chat.sceneType),
            name,
            preview,
            messageId: msg.id,
            updatedAt
          })
          return
        }

        const current = state.items[index]
        const next: MessageRemindItem = {
          ...current,
          name,
          preview,
          messageId: msg.id,
          updatedAt
        }
        state.items.splice(index, 1)
        state.items.unshift(next)
      })

      this.syncFromChatList()
    },

    pauseBlink() {
      this.$patch((state) => {
        state.blinkPaused = true
        state.shouldBlink = false
      })
      void this.hideWindow()
    },

    removeItem(sessionId: string) {
      if (!sessionId) return
      this.$patch((state) => {
        state.items = state.items.filter((item) => item.sessionId !== sessionId)
      })
      this.syncBlinkState()
    },

    clearAll() {
      this.$patch((state) => {
        state.items = []
        state.blinkPaused = false
        state.shouldBlink = false
      })
    },

    setWindowHovered(hovered: boolean) {
      this.$patch((state) => {
        state.windowHovered = hovered
      })
      if (hovered) {
        this.cancelHideWindow()
      }
    },

    cancelHideWindow() {
      this.$patch((state) => {
        state.hideSeq += 1
      })
    },

    scheduleHideWindow() {
      this.$patch((state) => {
        state.hideSeq += 1
      })
      const seq = this.hideSeq
      setTimeout(() => {
        const store = useMessageRemindStore()
        if (store.hideSeq !== seq) return
        if (store.windowHovered) return
        void store.hideWindow()
      }, HIDE_WINDOW_DELAY_MS)
    },

    hideWindow() {
      this.cancelHideWindow()
      this.$patch((state) => {
        state.windowHovered = false
      })
      return WebviewWindow.getByLabel(MESSAGE_REMIND_WINDOW_LABEL).then((remindWindow) => {
        return remindWindow?.hide()
      })
    },

    bindWindowEvents() {
      return WebviewWindow.getByLabel(MESSAGE_REMIND_WINDOW_LABEL).then((remindWindow) => {
        if (!remindWindow) return
        return remindWindow.listen('tauri://blur', () => {
          void this.scheduleHideWindow()
        })
      })
    },

    /** 按未读条数同步窗口高度：≤8 按条数，>8 固定为 8 条并滚动 */
    syncWindowSize() {
      const height = Math.max(calcMessageRemindWindowHeight(this.items.length), HEADER_HEIGHT + ITEM_HEIGHT)
      return WebviewWindow.getByLabel(MESSAGE_REMIND_WINDOW_LABEL).then((remindWindow) => {
        if (!remindWindow) return
        return remindWindow
          .setSize(new LogicalSize(WINDOW_WIDTH, height))
          .then(() => {
            if (!this.lastTrayRect) return
            return remindWindow.isVisible().then((visible) => {
              if (!visible || !this.lastTrayRect) return
              return this.placeNearTray(remindWindow, this.lastTrayRect)
            })
          })
          .catch(() => undefined)
      })
    },

    placeNearTray(remindWindow: WebviewWindow, rect: MessageRemindTrayRect) {
      return remindWindow.outerSize().then((outerSize) => {
        const x = Math.round(Math.max(0, rect.position.x + rect.size.width / 2 - outerSize.width / 2))
        const y = Math.round(Math.max(0, rect.position.y - outerSize.height + TRAY_WINDOW_OVERLAP_PX))
        return remindWindow.setPosition(new PhysicalPosition(x, y))
      })
    },

    showNearTray(rect: MessageRemindTrayRect) {
      // 仅 shouldBlink 为 true 时（有未读且未取消闪动）才响应托盘 hover
      if (!this.shouldBlink) return Promise.resolve()
      if (useSessionLockStore().locked) return Promise.resolve()

      this.cancelHideWindow()
      this.$patch((state) => {
        state.lastTrayRect = {
          position: { x: rect.position.x, y: rect.position.y },
          size: { width: rect.size.width, height: rect.size.height }
        }
      })

      const height = Math.max(calcMessageRemindWindowHeight(this.items.length), HEADER_HEIGHT + ITEM_HEIGHT)

      return WebviewWindow.getByLabel(MESSAGE_REMIND_WINDOW_LABEL).then((remindWindow) => {
        if (!remindWindow) return

        // 必须按 setSize → 定位 → show；勿用 isVisible 提前 return，否则 setSize 后偶发误判会跳过打开
        return remindWindow
          .setSize(new LogicalSize(WINDOW_WIDTH, height))
          .catch(() => undefined)
          .then(() => this.placeNearTray(remindWindow, rect))
          .then(() => remindWindow.show())
      })
    }
  }
})
