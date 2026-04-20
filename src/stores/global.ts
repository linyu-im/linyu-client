import { defineStore } from 'pinia'

type GlobalStore = {
  isAutoLogin: boolean
  selectedChatId: string
}

export const useGlobalStore = defineStore('global', {
  persist: true,
  state: (): GlobalStore => ({
    isAutoLogin: false,
    selectedChatId: ''
  }),
  actions: {
    setIsAutoLogin(isAutoLogin: boolean) {
      this.$patch((state) => {
        state.isAutoLogin = isAutoLogin
      })
    },
    setSelectedChatId(chatId: string) {
      this.$patch((state) => {
        state.selectedChatId = chatId
      })
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
