import { defineStore } from 'pinia'
import { useMessageDbStore } from '@/stores/message/messageDb'
import type { Message } from '@/types/api/message'

type MessageActionsStore = {
  deletedSeq: number
  deletedMessageId: string
}

export const useMessageActionsStore = defineStore('messageActions', {
  persist: true,
  share: { enable: true, initialize: true },
  state: (): MessageActionsStore => ({
    deletedSeq: 0,
    deletedMessageId: ''
  }),
  actions: {
    deleteLocalMessage(message: Message): Promise<void> {
      const messageId = message.id?.trim()
      if (!messageId) return Promise.resolve()

      return useMessageDbStore()
        .deleteLocalMessage(messageId)
        .then(() => {
          this.$patch((state) => {
            state.deletedMessageId = messageId
            state.deletedSeq += 1
          })
        })
    }
  }
})
