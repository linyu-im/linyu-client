import { defineStore } from 'pinia'

type ChatDetachedStore = {
  detachedChatIds: string[]
}

export const useChatDetachedStore = defineStore('chatDetached', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): ChatDetachedStore => ({
    detachedChatIds: []
  }),
  actions: {
    detach(chatId: string) {
      if (!chatId) return
      if (this.detachedChatIds.includes(chatId)) return
      this.$patch((state) => {
        state.detachedChatIds = [...state.detachedChatIds, chatId]
      })
    },

    attach(chatId: string) {
      if (!chatId) return
      if (!this.detachedChatIds.includes(chatId)) return
      this.$patch((state) => {
        state.detachedChatIds = state.detachedChatIds.filter((id) => id !== chatId)
      })
    },

    isDetached(chatId: string) {
      return this.detachedChatIds.includes(chatId)
    }
  }
})
