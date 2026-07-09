import { defineStore } from 'pinia'

type MessageUploadStore = {
  progressById: Record<string, number>
}

export const useMessageUploadStore = defineStore('messageUpload', {
  persist: {
    pick: []
  },
  share: {
    enable: true,
    initialize: true
  },
  state: (): MessageUploadStore => ({
    progressById: {}
  }),
  actions: {
    setProgress(messageId: string, progress: number) {
      const value = Math.min(100, Math.max(0, Math.round(progress)))
      if (this.progressById[messageId] === value) return
      this.$patch((state) => {
        state.progressById[messageId] = value
      })
    },
    clearProgress(messageId: string) {
      if (!(messageId in this.progressById)) return
      this.$patch((state) => {
        delete state.progressById[messageId]
      })
    },
    clearAll() {
      if (!Object.keys(this.progressById).length) return
      this.$patch((state) => {
        state.progressById = {}
      })
    }
  }
})
