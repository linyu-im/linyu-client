import { defineStore } from 'pinia'
import type { ShortcutKey } from '@/stores/app/appSettings'

export type ShortcutConflictKey = Exclude<ShortcutKey, 'sendMessage'>

type ShortcutConflictStore = {
  keys: ShortcutConflictKey[]
}

export const useShortcutConflictStore = defineStore('shortcutConflict', {
  persist: false,
  share: { enable: true, initialize: true },
  state: (): ShortcutConflictStore => ({
    keys: []
  }),
  actions: {
    setConflicts(keys: ShortcutConflictKey[]) {
      const unique = Array.from(new Set(keys))
      this.$patch((state) => {
        state.keys = unique
      })
    },
    hasConflict() {
      return this.keys.length > 0
    },
    isConflict(key: ShortcutConflictKey) {
      return this.keys.includes(key)
    }
  }
})
