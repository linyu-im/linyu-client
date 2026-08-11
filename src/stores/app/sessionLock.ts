import { defineStore } from 'pinia'
import { closeOrHideWindowsForSessionLock } from '@/utils/desktop/window'

type SessionLockStore = {
  locked: boolean
}

export const useSessionLockStore = defineStore('sessionLock', {
  persist: true,
  share: { enable: true, initialize: true },
  state: (): SessionLockStore => ({
    locked: false
  }),
  actions: {
    lock() {
      if (this.locked) return
      this.$patch((state) => {
        state.locked = true
      })
      void closeOrHideWindowsForSessionLock()
    },
    unlock() {
      if (!this.locked) return
      this.$patch((state) => {
        state.locked = false
      })
    }
  }
})
