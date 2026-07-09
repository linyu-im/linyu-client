import { defineStore } from 'pinia'
import { robotApi } from '@/api'
import { usePeerInfoStore } from '@/stores/user/peerInfo'
import type { FromType } from '@/types/common'

const NAME_CACHE_MAX = 1000

export const useNameStore = defineStore('name', () => {
  const peerInfoStore = usePeerInfoStore()
  const nameCache = new Map<string, string>()
  const inflight = new Map<string, Promise<string>>()

  const getCacheKey = (type: FromType, id: string) => `${type}:${id}`

  const cacheGet = (key: string) => {
    const name = nameCache.get(key)
    if (name === undefined) return undefined
    nameCache.delete(key)
    nameCache.set(key, name)
    return name
  }

  const cacheSet = (key: string, name: string) => {
    if (!name) return
    if (nameCache.has(key)) {
      nameCache.delete(key)
    } else if (nameCache.size >= NAME_CACHE_MAX) {
      const oldest = nameCache.keys().next().value
      if (oldest !== undefined) nameCache.delete(oldest)
    }
    nameCache.set(key, name)
  }

  const fetchRemoteName = async (type: FromType, id: string): Promise<string> => {
    if (!id) return ''

    switch (type) {
      case 'user': {
        const data = await peerInfoStore.fetchUser(id)
        if (!data) return ''
        return data.remark?.trim() || data.username || ''
      }
      case 'robot': {
        const res = await robotApi.getRobotInfo(id)
        if (res.code !== 0 || !res.data) return ''
        return res.data.robotName || ''
      }
      default:
        return ''
    }
  }

  const getCachedName = (type: FromType, id: string) => cacheGet(getCacheKey(type, id))

  const resolveName = async (type: FromType, id: string): Promise<string> => {
    if (!id || (type !== 'user' && type !== 'robot')) return ''

    const key = getCacheKey(type, id)
    const cached = cacheGet(key)
    if (cached) return cached

    const pending = inflight.get(key)
    if (pending) return pending

    const task = fetchRemoteName(type, id)
      .then((name) => {
        if (name) cacheSet(key, name)
        return name
      })
      .finally(() => {
        inflight.delete(key)
      })

    inflight.set(key, task)
    return task
  }

  return {
    getCachedName,
    resolveName
  }
})
