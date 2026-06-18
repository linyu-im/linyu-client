import { exists, mkdir, writeFile } from '@tauri-apps/plugin-fs'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join, BaseDirectory } from '@tauri-apps/api/path'
import { fetch } from '@tauri-apps/plugin-http'
import SparkMD5 from 'spark-md5'
import { defineStore } from 'pinia'
import { enterpriseApi, groupApi, robotApi, userApi } from '@/api'
import type { FromType } from '@/types/common'

export type { FromType } from '@/types/common'

const AVATAR_SRC_CACHE_MAX = 100

export const useAvatarStore = defineStore('avatar', () => {
  /** 全应用共用的内存 LRU，不 persist（convertFileSrc URL 仅运行时有效） */
  const srcCache = new Map<string, string>()
  const inflightLocal = new Map<string, Promise<string>>()
  /** 每次远程刷新成功后记录时间戳，用于通知所有 Avatar 实例同步更新 */
  const lastRefresh = reactive(new Map<string, number>())

  const getCacheKey = (type: string, id: string) => `${type}:${id}`

  const cacheGet = (key: string) => {
    const url = srcCache.get(key)
    if (url === undefined) return undefined
    srcCache.delete(key)
    srcCache.set(key, url)
    return url
  }

  const cacheSet = (key: string, url: string) => {
    if (!url) return
    if (srcCache.has(key)) {
      srcCache.delete(key)
    } else if (srcCache.size >= AVATAR_SRC_CACHE_MAX) {
      const oldest = srcCache.keys().next().value
      if (oldest !== undefined) srcCache.delete(oldest)
    }
    srcCache.set(key, url)
  }

  const getAvatarHash = (id: string) => SparkMD5.hash(id)

  const getAvatarRelativePath = (type: string, id: string) => {
    const hash = getAvatarHash(id)
    return `avatar/${type}/${hash.slice(0, 2)}/${hash}`
  }

  const toAssetUrl = async (relativePath: string) => {
    const dir = await appDataDir()
    const absolutePath = await join(dir, relativePath)
    return convertFileSrc(absolutePath)
  }

  const readLocalAvatar = async (type: string, id: string): Promise<string> => {
    const cacheKey = getCacheKey(type, id)
    const memCached = cacheGet(cacheKey)
    if (memCached) return memCached

    try {
      const avatarPath = getAvatarRelativePath(type, id)
      const isExist = await exists(avatarPath, { baseDir: BaseDirectory.AppData })
      if (isExist) {
        const url = await toAssetUrl(avatarPath)
        cacheSet(cacheKey, url)
        return url
      }
    } catch {
      // 本地文件不存在
    }
    return ''
  }

  const loadLocalAvatar = (type: string, id: string): Promise<string> => {
    if (!id) return Promise.resolve('')

    const cacheKey = getCacheKey(type, id)
    const cached = cacheGet(cacheKey)
    if (cached) return Promise.resolve(cached)

    const pending = inflightLocal.get(cacheKey)
    if (pending) return pending

    const task = readLocalAvatar(type, id).finally(() => {
      inflightLocal.delete(cacheKey)
    })
    inflightLocal.set(cacheKey, task)
    return task
  }

  const saveAvatarToLocal = async (type: string, id: string, imageData: Uint8Array) => {
    const avatarPath = getAvatarRelativePath(type, id)
    const hash = getAvatarHash(id)
    const fullDir = `avatar/${type}/${hash.slice(0, 2)}`
    const dirExist = await exists(fullDir, { baseDir: BaseDirectory.AppData })
    if (!dirExist) {
      await mkdir(fullDir, { baseDir: BaseDirectory.AppData, recursive: true })
    }
    await writeFile(avatarPath, imageData, { baseDir: BaseDirectory.AppData })
    const url = await toAssetUrl(avatarPath)
    cacheSet(getCacheKey(type, id), url)
    return url
  }

  const downloadImage = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  const fetchRemoteAvatar = async (type: FromType, id: string): Promise<string> => {
    if (!id) return ''

    let res
    switch (type) {
      case 'group':
        res = await groupApi.getGroupAvatar(id)
        break
      case 'enterprise':
        res = await enterpriseApi.getEnterpriseAvatar(id)
        break
      case 'robot':
        res = await robotApi.getRobotAvatar(id)
        break
      default:
        res = await userApi.getUserAvatar(id)
    }
    if (res.code !== 0 || !res.data) return ''

    const imageData = await downloadImage(res.data)
    return saveAvatarToLocal(type, id, imageData)
  }

  const getCachedSrc = (type: FromType, id: string) => cacheGet(getCacheKey(type, id))

  const resolveSrc = async (type: FromType, id: string): Promise<string> => {
    if (!id) return ''

    const localUrl = await loadLocalAvatar(type, id)
    if (localUrl) return localUrl

    return fetchRemoteAvatar(type, id)
  }

  const refreshSrc = async (type: FromType, id: string): Promise<string> => {
    if (!id) return ''

    const cacheKey = getCacheKey(type, id)
    srcCache.delete(cacheKey)

    const url = await fetchRemoteAvatar(type, id)
    if (url) {
      lastRefresh.set(cacheKey, Date.now())
      return url
    }

    return loadLocalAvatar(type, id)
  }

  /** 获取指定头像的最后刷新时间戳（响应式，用于跨实例同步） */
  const getLastRefresh = (type: FromType, id: string): number => {
    return lastRefresh.get(getCacheKey(type, id)) ?? 0
  }

  const prefetch = (id: string, type: FromType = 'user') => loadLocalAvatar(type, id)

  const prefetchMany = (ids: string[], type: FromType = 'user') => {
    const unique = [...new Set(ids.filter(Boolean))]
    void Promise.all(unique.map((id) => prefetch(id, type)))
  }

  return {
    getCachedSrc,
    resolveSrc,
    refreshSrc,
    getLastRefresh,
    prefetch,
    prefetchMany
  }
})
