import { defineStore } from 'pinia'

export interface LoginHistoryItem {
  account: string
  userId: string
  keepLogin?: boolean
  token?: string
}

type LoginHistoryStore = {
  accounts: LoginHistoryItem[]
}

const MAX_HISTORY = 10

export const useLoginHistoryStore = defineStore('loginHistory', {
  persist: true,
  share: { enable: true, initialize: true },
  state: (): LoginHistoryStore => ({
    accounts: []
  }),
  actions: {
    addAccount(item: LoginHistoryItem) {
      this.$patch((state) => {
        const filtered = state.accounts.filter((a) => a.account !== item.account)
        const keepLogin = !!(item.keepLogin && item.token)
        const next: LoginHistoryItem = {
          account: item.account,
          userId: item.userId,
          keepLogin,
          ...(keepLogin ? { token: item.token } : {})
        }
        state.accounts = [next, ...filtered].slice(0, MAX_HISTORY)
      })
    },
    removeAccount(account: string) {
      this.$patch((state) => {
        state.accounts = state.accounts.filter((a) => a.account !== account)
      })
    },
    findByAccount(account: string) {
      return this.accounts.find((a) => a.account === account)
    },
    setKeepLogin(account: string, keepLogin: boolean, token?: string) {
      this.$patch((state) => {
        const target = state.accounts.find((a) => a.account === account)
        if (!target) return
        target.keepLogin = keepLogin
        if (keepLogin && token) {
          target.token = token
        } else {
          delete target.token
          target.keepLogin = false
        }
      })
    },
    clearKeepLogin(account: string) {
      this.setKeepLogin(account, false)
    }
  }
})
