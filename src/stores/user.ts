import { defineStore } from 'pinia'

type UserStore = {
  userInfo: {
    token: string
    userId: string
    isLoggedIn?: boolean
  }
}

export const useUserStore = defineStore('user', {
  persist: true,
  state: (): UserStore => ({
    userInfo: {
      token: '',
      userId: '',
      isLoggedIn: false
    }
  }),
  actions: {
    setUserInfo(userInfo: UserStore['userInfo']) {
      this.$patch((state) => {
        state.userInfo.token = userInfo.token
        state.userInfo.userId = userInfo.userId
        state.userInfo.isLoggedIn = true
      })
    },

    removeUserInfo() {
      this.$patch((state) => {
        state.userInfo.token = ''
        state.userInfo.userId = ''
        state.userInfo.isLoggedIn = false
      })
    }
  },

  share: {
    enable: true,
    initialize: true
  }
})
