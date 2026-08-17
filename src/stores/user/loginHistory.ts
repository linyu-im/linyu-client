import { defineStore } from 'pinia'
import {
  mergeLoginHistory,
  readLoginHistoryDisk,
  readLoginHistoryLocal,
  writeLoginHistoryDisk,
  writeLoginHistoryLocal
} from '@/utils/auth/loginHistoryStorage'

export interface LoginHistoryItem {
  account: string
  userId: string
  keepLogin?: boolean
  token?: string
}

type LoginHistoryStore = {
  accounts: LoginHistoryItem[]
  hydrated: boolean
}

const MAX_HISTORY = 10

export const useLoginHistoryStore = defineStore('loginHistory', {
  persist: false,
  share: { enable: false, initialize: false },
  state: (): LoginHistoryStore => ({
    accounts: readLoginHistoryLocal(),
    hydrated: false
  }),
  actions: {
    persistAccounts() {
      writeLoginHistoryLocal(this.accounts)
      void writeLoginHistoryDisk(this.accounts)
    },

    hydrate() {
      const local = readLoginHistoryLocal()
      return readLoginHistoryDisk().then((disk) => {
        const merged = mergeLoginHistory(local, disk, this.accounts).slice(0, MAX_HISTORY)
        this.$patch((state) => {
          state.accounts = merged
          state.hydrated = true
        })
        this.persistAccounts()
        return merged
      })
    },

    addAccount(item: LoginHistoryItem) {
      const account = item.account.trim()
      if (!account) {
        console.warn('[loginHistory] skip addAccount: empty account', item)
        return
      }

      this.$patch((state) => {
        const filtered = state.accounts.filter((a) => a.account !== account)
        const keepLogin = !!(item.keepLogin && item.token)
        const next: LoginHistoryItem = {
          account,
          userId: item.userId,
          keepLogin,
          ...(keepLogin ? { token: item.token } : {})
        }
        state.accounts = [next, ...filtered].slice(0, MAX_HISTORY)
      })
      this.persistAccounts()
      console.info(
        '[loginHistory] saved',
        this.accounts.map((a) => a.account)
      )
    },

    removeAccount(account: string) {
      this.$patch((state) => {
        state.accounts = state.accounts.filter((a) => a.account !== account)
      })
      this.persistAccounts()
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
      this.persistAccounts()
    },

    clearKeepLogin(account: string) {
      this.setKeepLogin(account, false)
    }
  }
})
