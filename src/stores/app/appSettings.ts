import { defineStore } from 'pinia'
import { ThemePatternEnum } from '@/constants/system'

export type ShortcutKey = 'sendMessage' | 'sendVoice' | 'openUnread' | 'screenshot' | 'lock' | 'toggleWindow'

/** 侧栏通知标记槽位（与 homeNavBadge 对齐） */
export type NotificationBadgeSlot = 'message' | 'contacts' | 'moment' | 'ai' | 'drive' | 'application' | 'more'

export type NotificationFlagKey = 'messageSound' | 'callSound' | 'momentsInteraction'

export type GeneralFieldKey =
  | 'autoTranslate'
  | 'translateTo'
  | 'fontSize'
  | 'autoLaunchOnStartup'
  | 'closeMainPanelAction'
  | 'voiceToText'

type AppSettingsStore = {
  account: {
    keepChatHistory: boolean
  }
  storage: {
    path: string
  }
  general: {
    autoTranslate: boolean
    translateTo: string
    fontSize: number
    autoLaunchOnStartup: boolean
    closeMainPanelAction: CloseMainPanelAction
    voiceToText: boolean
  }
  notifications: {
    messageSound: boolean
    callSound: boolean
    momentsInteraction: boolean
    badges: Record<NotificationBadgeSlot, boolean>
  }
  shortcuts: Record<ShortcutKey, string>
}

const DEFAULT_SHORTCUTS: Record<ShortcutKey, string> = {
  sendMessage: 'Enter',
  sendVoice: 'Alt+V',
  openUnread: 'Ctrl+Alt+U',
  screenshot: 'Alt+A',
  lock: 'Ctrl+L',
  toggleWindow: 'Ctrl+Alt+W'
}

const DEFAULT_BADGES: Record<NotificationBadgeSlot, boolean> = {
  message: true,
  contacts: true,
  moment: true,
  ai: true,
  drive: true,
  application: true,
  more: true
}

export const useAppSettingsStore = defineStore('appSettings', {
  persist: true,
  state: (): AppSettingsStore => ({
    account: {
      keepChatHistory: true
    },
    storage: {
      path: ''
    },
    general: {
      autoTranslate: false,
      translateTo: 'zh',
      fontSize: 50,
      autoLaunchOnStartup: false,
      closeMainPanelAction: 'minimizeToTray' as CloseMainPanelAction,
      voiceToText: false
    },
    notifications: {
      messageSound: true,
      callSound: true,
      momentsInteraction: false,
      badges: { ...DEFAULT_BADGES }
    },
    shortcuts: { ...DEFAULT_SHORTCUTS }
  }),
  actions: {
    setShortcut(key: ShortcutKey, value: string) {
      this.$patch((state) => {
        state.shortcuts[key] = value
      })
    },
    resetShortcuts() {
      this.$patch((state) => {
        state.shortcuts = { ...DEFAULT_SHORTCUTS }
      })
    },
    setBadgeEnabled(slot: NotificationBadgeSlot, enabled: boolean) {
      this.$patch((state) => {
        if (!state.notifications.badges) {
          state.notifications.badges = { ...DEFAULT_BADGES }
        }
        state.notifications.badges[slot] = enabled
      })
    },
    setNotificationFlag(key: NotificationFlagKey, value: boolean) {
      this.$patch((state) => {
        state.notifications[key] = value
      })
    },
    setGeneralField<K extends GeneralFieldKey>(key: K, value: AppSettingsStore['general'][K]) {
      this.$patch((state) => {
        state.general[key] = value
      })
    },
    /** 兼容旧持久化数据：补齐 badges 缺省项 */
    ensureNotificationBadges() {
      this.$patch((state) => {
        const legacy = state.notifications as AppSettingsStore['notifications'] & {
          badgeMoments?: boolean
        }
        const merged = { ...DEFAULT_BADGES, ...(legacy.badges || {}) }
        if (legacy.badgeMoments === false) {
          merged.moment = false
        }
        state.notifications.badges = merged
      })
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

export type AppearanceOption = ThemePatternEnum
export type CloseMainPanelAction = 'minimizeToTray' | 'exit'
