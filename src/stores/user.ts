import { defineStore } from 'pinia'

type User = {
  userInfo: {
    token: string
    userId: string
    isLoggedIn?: boolean
  }
}

export const useUserStore = defineStore('user', {
  persist: true,
  state: (): User => ({
    userInfo: {
      token: '',
      userId: '',
      isLoggedIn: false
    }
  }),
  actions: {
    setUserInfo(userInfo: User['userInfo']) {
      this.userInfo = userInfo
      this.userInfo.isLoggedIn = true
    },
    removeUserInfo() {
      this.userInfo = {
        token: '',
        userId: '',
        isLoggedIn: false
      }
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
