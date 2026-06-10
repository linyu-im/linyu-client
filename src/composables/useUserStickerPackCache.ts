import { ref } from 'vue'
import { stickerApi } from '@/api'
import type { StickerPack } from '@/types/api/sticker'

const cachedUserPacks = ref<StickerPack[]>([])
const loading = ref(false)
let pending: Promise<StickerPack[]> | null = null

export function useUserStickerPackCache() {
  const loadUserPacks = () => {
    if (cachedUserPacks.value.length) {
      return Promise.resolve(cachedUserPacks.value)
    }
    if (pending) {
      return pending
    }
    loading.value = true
    pending = stickerApi
      .userPackList()
      .then((res) => {
        if (res.code === 0 && res.data) {
          cachedUserPacks.value = res.data
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

  return {
    cachedUserPacks,
    packLoading: loading,
    loadUserPacks
  }
}
