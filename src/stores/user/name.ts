import { defineStore } from 'pinia'
import { groupApi, robotApi } from '@/api'
import { usePeerInfoStore } from '@/stores/user/peerInfo'
import type { FromType } from '@/types/common'

const NAME_CACHE_MAX = 1000

export const useNameStore = defineStore('name', () => {
  const peerInfoStore = usePeerInfoStore()
  const nameCache = new Map<string, string>()
  const inflight = new Map<string, Promise<string>>()

  const getCacheKey = (type: FromType, id: string, groupId = '') => {
    if (type === 'user' && groupId) return `${type}:${id}:g:${groupId}`
    return `${type}:${id}`
  }

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

  const fetchRemoteName = async (type: FromType, id: string, groupId = ''): Promise<string> => {
    if (!id) return ''

    switch (type) {
      case 'user': {
        if (groupId) {
          const res = await groupApi.getMemberInfo({ groupId, userId: id })
          if (res.code === 0 && res.data) {
            const groupNickName = res.data.groupNickName?.trim()
            if (groupNickName) return groupNickName
          }
        }

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

  const getCachedName = (type: FromType, id: string, groupId = '') =>
    cacheGet(getCacheKey(type, id, type === 'user' ? groupId : ''))

  const resolveName = async (type: FromType, id: string, groupId = ''): Promise<string> => {
    if (!id || (type !== 'user' && type !== 'robot')) return ''

    const normalizedGroupId = type === 'user' ? groupId : ''
    const key = getCacheKey(type, id, normalizedGroupId)
    const cached = cacheGet(key)
    if (cached) return cached

    const pending = inflight.get(key)
    if (pending) return pending

    const task = fetchRemoteName(type, id, normalizedGroupId)
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

  const removeCachedName = (type: FromType, id: string, groupId = '') => {
    if (!id || (type !== 'user' && type !== 'robot')) return

    const key = getCacheKey(type, id, type === 'user' ? groupId : '')
    nameCache.delete(key)
    inflight.delete(key)
  }

  return {
    getCachedName,
    resolveName,
    removeCachedName
  }
})
