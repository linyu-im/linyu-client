import { ref } from 'vue'
import { stickerApi } from '@/api'
import { queryStickerPacks, replaceStickerPacks } from '@/db'
import type { StickerPack } from '@/types/api/sticker'

const cachedUserPacks = ref<StickerPack[]>([])
const loading = ref(false)
let pending: Promise<StickerPack[]> | null = null

function persistStickerPacks(list: StickerPack[]) {
  replaceStickerPacks(list).catch((error: unknown) => {
    console.error('[sticker] replaceStickerPacks failed:', error)
  })
}

function refreshFromApi() {
  if (pending) {
    return pending
  }
  if (!cachedUserPacks.value.length) {
    loading.value = true
  }
  pending = stickerApi
    .userPackList()
    .then((res) => {
      if (res.code === 0 && res.data) {
        cachedUserPacks.value = res.data
        persistStickerPacks(res.data)
      } else if (res.code !== 0) {
        window.$message.error(res.msg)
      }
      return cachedUserPacks.value
    })
    .finally(() => {
      loading.value = false
      pending = null
    })
  return pending
}

export function useUserStickerPackCache() {
  const loadUserPacks = () => {
    const remote = refreshFromApi()
    if (cachedUserPacks.value.length) {
      return Promise.resolve(cachedUserPacks.value)
    }
    return queryStickerPacks()
      .then((rows: StickerPack[]) => {
        if (rows.length && pending) {
          cachedUserPacks.value = rows
          loading.value = false
          return rows
        }
        if (cachedUserPacks.value.length) {
          return cachedUserPacks.value
        }
        return remote
      })
      .catch((error: unknown) => {
        console.error('[sticker] queryStickerPacks failed:', error)
        return remote
      })
  }

  return {
    cachedUserPacks,
    packLoading: loading,
    loadUserPacks
  }
}
