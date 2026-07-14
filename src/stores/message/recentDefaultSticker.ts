import { defineStore } from 'pinia'
import type { Sticker } from '@/types/api/sticker'

const MAX_RECENT = 11

type RecentDefaultStickerStore = {
  stickers: Sticker[]
}

export const useRecentDefaultStickerStore = defineStore('recentDefaultSticker', {
  persist: false,
  share: { enable: true, initialize: true },
  state: (): RecentDefaultStickerStore => ({
    stickers: []
  }),
  actions: {
    addSticker(sticker: Sticker) {
      this.$patch((state) => {
        const rest = state.stickers.filter((item) => item.id !== sticker.id)
        state.stickers = [sticker, ...rest].slice(0, MAX_RECENT)
      })
    }
  }
})
