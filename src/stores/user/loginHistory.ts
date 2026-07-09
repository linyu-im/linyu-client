import { defineStore } from 'pinia'

export interface LoginHistoryItem {
  account: string
  userId: string
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
        state.accounts = [item, ...filtered].slice(0, MAX_HISTORY)
      })
    },
    removeAccount(account: string) {
      this.$patch((state) => {
        state.accounts = state.accounts.filter((a) => a.account !== account)
      })
    }
  }
})
