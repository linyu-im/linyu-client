import { defineStore } from 'pinia'

export interface ImgViewerItem {
  url: string
  name: string
}

type ImgViewerStore = {
  images: ImgViewerItem[]
  currentIndex: number
}

export const useImgViewerStore = defineStore('imgViewer', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): ImgViewerStore => ({
    images: [],
    currentIndex: 0
  }),
  actions: {
    openViewer(images: ImgViewerItem[], index = 0) {
      this.$patch((state) => {
        state.images = images
        state.currentIndex = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0))
      })
    },
    setCurrentIndex(index: number) {
      this.$patch((state) => {
        state.currentIndex = index
      })
    },
    reset() {
      this.$patch((state) => {
        state.images = []
        state.currentIndex = 0
      })
    }
  }
})
