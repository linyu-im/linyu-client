import { ref } from 'vue'
import { stickerApi } from '@/api'
import { queryDefaultStickers, replaceDefaultStickers } from '@/db'
import type { Sticker } from '@/types/api/sticker'

const cachedDefaultStickers = ref<Sticker[]>([])
const loading = ref(false)
let pending: Promise<Sticker[]> | null = null

function persistDefaultStickers(list: Sticker[]) {
  replaceDefaultStickers(list).catch((error: unknown) => {
    console.error('[sticker] replaceDefaultStickers failed:', error)
  })
}

function refreshFromApi() {
  if (pending) {
    return pending
  }
  if (!cachedDefaultStickers.value.length) {
    loading.value = true
  }
  pending = stickerApi
    .defaultList()
    .then((res) => {
      if (res.code === 0 && res.data) {
        cachedDefaultStickers.value = res.data
        persistDefaultStickers(res.data)
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

export function useDefaultStickerCache() {
  const loadDefaultStickers = () => {
    const remote = refreshFromApi()
    if (cachedDefaultStickers.value.length) {
      return Promise.resolve(cachedDefaultStickers.value)
    }
    return queryDefaultStickers()
      .then((rows: Sticker[]) => {
        if (rows.length && pending) {
          cachedDefaultStickers.value = rows
          loading.value = false
          return rows
        }
        if (cachedDefaultStickers.value.length) {
          return cachedDefaultStickers.value
        }
        return remote
      })
      .catch((error: unknown) => {
        console.error('[sticker] queryDefaultStickers failed:', error)
        return remote
      })
  }

  return {
    cachedDefaultStickers,
    defaultLoading: loading,
    loadDefaultStickers
  }
}
