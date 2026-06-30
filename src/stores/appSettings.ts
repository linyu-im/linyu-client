import { defineStore } from 'pinia'
import { ThemePatternEnum } from '@/constants/system'

export const useAppSettingsStore = defineStore('appSettings', {
  persist: true,
  state: () => ({
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
      badgeMoments: true,
      momentsInteraction: false
    },
    shortcuts: {
      sendMessage: 'Enter',
      sendVoice: 'Right Alt',
      openUnread: 'Ctrl+Alt+U',
      screenshot: 'Alt+A',
      lock: 'Ctrl+L',
      toggleWindow: 'Ctrl+Alt+W'
    }
  }),
  actions: {
    resetShortcuts() {
      this.shortcuts = {
        sendMessage: 'Enter',
        sendVoice: 'Right Alt',
        openUnread: 'Ctrl+Alt+U',
        screenshot: 'Alt+A',
        lock: 'Ctrl+L',
        toggleWindow: 'Ctrl+Alt+W'
      }
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})

export type AppearanceOption = ThemePatternEnum
export type CloseMainPanelAction = 'minimizeToTray' | 'exit'
