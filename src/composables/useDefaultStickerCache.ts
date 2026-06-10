import { ref } from 'vue'
import { stickerApi } from '@/api'
import type { Sticker } from '@/types/api/sticker'

const cachedDefaultStickers = ref<Sticker[]>([])
const loading = ref(false)
let pending: Promise<Sticker[]> | null = null

export function useDefaultStickerCache() {
  const loadDefaultStickers = () => {
    if (cachedDefaultStickers.value.length) {
      return Promise.resolve(cachedDefaultStickers.value)
    }
    if (pending) {
      return pending
    }
    loading.value = true
    pending = stickerApi
      .defaultList()
      .then((res) => {
        if (res.code === 0 && res.data) {
          cachedDefaultStickers.value = res.data
        } else if (res.code !== 0) {
          window.$message.error(res.msg)
        }
        return cachedDefaultStickers.value
      })
      .finally(() => {
        loading.value = false
        pending = null
      })
    return pending
  }

  return {
    cachedDefaultStickers,
    defaultLoading: loading,
    loadDefaultStickers
  }
}
