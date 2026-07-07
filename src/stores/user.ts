import type { User } from '@/types/api/user'
import { disconnectWebSocket } from '@/utils/websocket'
import { defineStore } from 'pinia'

type UserStore = {
  authInfo: {
    token: string
    userId: string
    isLoggedIn?: boolean
  }
  userInfo: User
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
      phone: null,
      email: null,
      gitee: null,
      gender: '',
      avatar: '',
      userLevel: 0,
      signature: '',
      location: '',
      momentBgUrl: '',
      birthday: '',
      emotionId: '',
      status: '',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      emotionName: '',
      emotionUrl: '',
      remark: '',
      moment: null
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
      void disconnectWebSocket()
      this.$patch((state) => {
        state.authInfo.token = ''
        state.authInfo.userId = ''
        state.authInfo.isLoggedIn = false
      })
    },
    setUserInfo(info: User) {
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
