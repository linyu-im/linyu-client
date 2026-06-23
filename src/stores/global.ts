import { defineStore } from 'pinia'

type GlobalStore = {
  isAutoLogin: boolean
}

export const useGlobalStore = defineStore('global', {
  persist: true,
  state: (): GlobalStore => ({
    isAutoLogin: false
  }),
  actions: {
    setIsAutoLogin(isAutoLogin: boolean) {
      this.$patch((state) => {
        state.isAutoLogin = isAutoLogin
      })
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
