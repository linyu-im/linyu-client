import { defineStore } from 'pinia'

type User = {
  userInfo: {
    token: string
    userId: string
  }
}

export const useUserStore = defineStore('user', {
  persist: true,
  state: (): User => ({
    userInfo: {
      token: '',
      userId: ''
    }
  }),
  actions: {
    setUserInfo(userInfo: User['userInfo']) {
      this.userInfo = userInfo
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
