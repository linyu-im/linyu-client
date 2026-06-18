import { Message } from '@/types/api/message'
import { useUserStore } from '@/stores/user'
import { defineStore } from 'pinia'

export const useWebSocketStore = defineStore('websocket', {
  persist: false,
  state: () => ({
    lastServerMessage: null as Message | null
  }),
  actions: {
    receiveMsg(msg: Message | null) {
      const currentUserId = useUserStore().authInfo.userId
      if (msg?.fromId === currentUserId) return
      this.$patch((state) => {
        state.lastServerMessage = msg
      })
    },
    clearMsg() {
      this.$patch((state) => {
        state.lastServerMessage = null
      })
    }
  }
})
