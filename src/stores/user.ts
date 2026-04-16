import { UserInfoResult } from '@/types/api/user'
import { defineStore } from 'pinia'

type UserStore = {
  authInfo: {
    token: string
    userId: string
    isLoggedIn?: boolean
  }
  userInfo: UserInfoResult
}

export const useUserStore = defineStore('user', {
  persist: true,
  state: (): UserStore => ({
    authInfo: {
      token: '',
      userId: '',
      isLoggedIn: false
    },
    userInfo: {
      id: '',
      username: '',
      account: '',
      phone: '',
      email: '',
      gitee: '',
      gender: '',
      avatar: '',
      birthday: '',
      emotionId: '',
      status: '',
      emotionName: '',
      emotionUrl: ''
    }
  }),
  actions: {
    setAuthInfo(authInfo: UserStore['authInfo']) {
      this.$patch((state) => {
        state.authInfo.token = authInfo.token
        state.authInfo.userId = authInfo.userId
        state.authInfo.isLoggedIn = true
      })
    },
    removeAuthInfo() {
      this.$patch((state) => {
        state.authInfo.token = ''
        state.authInfo.userId = ''
        state.authInfo.isLoggedIn = false
      })
    },
    setUserInfo(info: UserInfoResult) {
      this.$patch((state) => {
        state.userInfo = info
      })
    },
    setUserEmotion(emotionId: string, emotionName: string, emotionUrl: string) {
      this.$patch((state) => {
        state.userInfo.emotionId = emotionId
        state.userInfo.emotionName = emotionName
        state.userInfo.emotionUrl = emotionUrl
      })
    }
  },

  share: {
    enable: true,
    initialize: true
  }
})
