import { defineStore } from 'pinia'

export interface VideoViewerItem {
  url: string
  name: string
}

type VideoViewerStore = {
  videos: VideoViewerItem[]
  currentIndex: number
}

export const useVideoViewerStore = defineStore('videoViewer', {
  persist: true,
  share: {
    enable: true,
    initialize: true
  },
  state: (): VideoViewerStore => ({
    videos: [],
    currentIndex: 0
  }),
  actions: {
    openViewer(videos: VideoViewerItem[], index = 0) {
      this.$patch((state) => {
        state.videos = videos
        state.currentIndex = Math.min(Math.max(index, 0), Math.max(videos.length - 1, 0))
      })
    },
    setCurrentIndex(index: number) {
      this.$patch((state) => {
        state.currentIndex = index
      })
    },
    reset() {
      this.$patch((state) => {
        state.videos = []
        state.currentIndex = 0
      })
    }
  }
})
