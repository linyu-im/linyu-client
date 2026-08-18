import { ref } from 'vue'
import { emotionApi } from '@/api'
import { queryEmotions, replaceEmotions } from '@/db'
import type { Emotion } from '@/types/api/emotion'

const cachedEmotions = ref<Emotion[]>([])
const loading = ref(false)
let pending: Promise<Emotion[]> | null = null

function persistEmotions(list: Emotion[]) {
  replaceEmotions(list).catch((error: unknown) => {
    console.error('[emotion] replaceEmotions failed:', error)
  })
}

function refreshFromApi() {
  if (pending) {
    return pending
  }
  if (!cachedEmotions.value.length) {
    loading.value = true
  }
  pending = emotionApi
    .list()
    .then((res) => {
      if (res.code === 0 && res.data) {
        cachedEmotions.value = res.data
        persistEmotions(res.data)
      } else if (res.code !== 0) {
        window.$message.error(res.msg)
      }
      return cachedEmotions.value
    })
    .finally(() => {
      loading.value = false
      pending = null
    })
  return pending
}

export function useEmotionCache() {
  const loadEmotions = () => {
    const remote = refreshFromApi()
    if (cachedEmotions.value.length) {
      return Promise.resolve(cachedEmotions.value)
    }
    return queryEmotions()
      .then((rows: Emotion[]) => {
        if (rows.length && pending) {
          cachedEmotions.value = rows
          loading.value = false
          return rows
        }
        if (cachedEmotions.value.length) {
          return cachedEmotions.value
        }
        return remote
      })
      .catch((error: unknown) => {
        console.error('[emotion] queryEmotions failed:', error)
        return remote
      })
  }

  return {
    cachedEmotions,
    emotionLoading: loading,
    loadEmotions
  }
}
