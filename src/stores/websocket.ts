import { Message } from '@/types/api/message'
import { defineStore } from 'pinia'

export const useWebSocketStore = defineStore('websocket', {
  persist: false,
  state: () => ({
    lastServerMessage: null as Message | null
  }),
  actions: {
    receiveMsg(msg: Message | null) {
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
