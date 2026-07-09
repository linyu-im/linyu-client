import { defineStore } from 'pinia'
import type { Message } from '@/types/api/message'

type SendingMessagesStore = {
  messagesByPeer: Record<string, Message[]>
}

export const useSendingMessagesStore = defineStore('sendingMessages', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): SendingMessagesStore => ({
    messagesByPeer: {}
  }),
  actions: {
    addMessage(toId: string, message: Message) {
      this.$patch((state) => {
        if (!state.messagesByPeer[toId]) {
          state.messagesByPeer[toId] = []
        }
        const exists = state.messagesByPeer[toId].some((m) => m.id === message.id)
        if (!exists) {
          state.messagesByPeer[toId].push(message)
        }
      })
    },
    updateMessage(toId: string, localId: string, patch: Partial<Message>) {
      this.$patch((state) => {
        const messages = state.messagesByPeer[toId]
        if (!messages) return
        const index = messages.findIndex((m) => m.id === localId)
        if (index === -1) return
        messages[index] = { ...messages[index], ...patch } as Message
      })
    },
    removeMessage(toId: string, localId: string) {
      this.$patch((state) => {
        const messages = state.messagesByPeer[toId]
        if (!messages) return
        state.messagesByPeer[toId] = messages.filter((m) => m.id !== localId)
      })
    },
    clearPeer(toId: string) {
      this.$patch((state) => {
        delete state.messagesByPeer[toId]
      })
    },
    getMessages(toId: string): Message[] {
      return this.messagesByPeer[toId] || []
    }
  }
})
