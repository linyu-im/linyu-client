import { defineStore } from 'pinia'
import { enterpriseApi, groupApi, userApi } from '@/api'
import { SceneType } from '@/constants/common'
import type { EnterprisInfo } from '@/types/api/enterprise'
import type { GroupInfoResult } from '@/types/api/group'
import type { UserInfoResult } from '@/types/api/user'
import type { FromType } from '@/types/common'

const PEER_INFO_CACHE_MAX = 50

export type PeerInfoType = Extract<FromType, 'user' | 'group' | 'enterprise'>

type UserCacheEntry = {
  id: string
  data: UserInfoResult
}

type GroupCacheEntry = {
  id: string
  data: GroupInfoResult
}

type EnterpriseCacheEntry = {
  id: string
  data: EnterprisInfo
}

type PeerInfoStore = {
  users: UserCacheEntry[]
  groups: GroupCacheEntry[]
  enterprises: EnterpriseCacheEntry[]
}

const inflight = new Map<string, Promise<unknown>>()

function dataEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function readCache<T extends { id: string; data: unknown }>(entries: T[], id: string): T['data'] | null {
  const entry = entries.find((e) => e.id === id)
  return entry ? (entry.data as T['data']) : null
}

function writeCache<T extends { id: string; data: unknown }>(
  entries: T[],
  id: string,
  data: T['data'],
  max: number
): T[] {
  const next = [...entries]
  const idx = next.findIndex((e) => e.id === id)

  if (idx >= 0) {
    const [item] = next.splice(idx, 1)
    next.push({ ...item, data } as T)
  } else {
    if (next.length >= max) {
      next.shift()
    }
    next.push({ id, data } as T)
  }

  return next
}

function touchCache<T extends { id: string; data: unknown }>(entries: T[], id: string): T[] {
  const idx = entries.findIndex((e) => e.id === id)
  if (idx < 0) return entries

  const next = [...entries]
  const [item] = next.splice(idx, 1)
  next.push(item)
  return next
}

function toPeerInfoType(type: PeerInfoType | SceneType): PeerInfoType {
  if (type === 'group') return 'group'
  if (type === 'enterprise') return 'enterprise'
  return 'user'
}

export const usePeerInfoStore = defineStore('peerInfo', {
  persist: true,
  share: {
    enable: true,
    initialize: true
  },
  state: (): PeerInfoStore => ({
    users: [],
    groups: [],
    enterprises: []
  }),
  actions: {
    read(peerId: string, type: PeerInfoType | SceneType): UserInfoResult | GroupInfoResult | EnterprisInfo | null {
      if (!peerId) return null

      switch (toPeerInfoType(type)) {
        case 'group':
          return readCache(this.groups, peerId)
        case 'enterprise':
          return readCache(this.enterprises, peerId)
        default:
          return readCache(this.users, peerId)
      }
    },
    get(peerId: string, type: PeerInfoType | SceneType): UserInfoResult | GroupInfoResult | EnterprisInfo | null {
      if (!peerId) return null

      switch (toPeerInfoType(type)) {
        case 'group':
          void this.fetchGroup(peerId)
          break
        case 'enterprise':
          void this.fetchEnterprise(peerId)
          break
        default:
          void this.fetchUser(peerId)
      }

      return this.read(peerId, type)
    },
    patchUser(userId: string, patch: Partial<UserInfoResult>) {
      const current = readCache(this.users, userId)
      if (!current) return

      this.$patch((state) => {
        state.users = writeCache(state.users, userId, { ...current, ...patch }, PEER_INFO_CACHE_MAX)
      })
    },
    fetchUser(userId: string): Promise<UserInfoResult | null> {
      if (!userId) return Promise.resolve(null)

      const key = `user:${userId}`
      const pending = inflight.get(key) as Promise<UserInfoResult | null> | undefined
      if (pending) return pending

      const cached = readCache(this.users, userId)
      const task = userApi
        .getUserInfo({ userId })
        .then((res) => {
          if (res.code === 0 && res.data) {
            const data = res.data
            const current = readCache(this.users, userId)
            this.$patch((state) => {
              if (!current || !dataEquals(current, data)) {
                state.users = writeCache(state.users, userId, data, PEER_INFO_CACHE_MAX)
              } else {
                state.users = touchCache(state.users, userId)
              }
            })
            return data
          }
          if (res.code !== 0) {
            window.$message.error(res.msg)
          }
          return readCache(this.users, userId) ?? cached
        })
        .finally(() => {
          inflight.delete(key)
        })

      inflight.set(key, task)
      return task
    },
    fetchGroup(groupId: string): Promise<GroupInfoResult | null> {
      if (!groupId) return Promise.resolve(null)

      const key = `group:${groupId}`
      const pending = inflight.get(key) as Promise<GroupInfoResult | null> | undefined
      if (pending) return pending

      const cached = readCache(this.groups, groupId)
      const task = groupApi
        .getGroupInfo({ groupId })
        .then((res) => {
          if (res.code === 0 && res.data) {
            const data = res.data
            const current = readCache(this.groups, groupId)
            this.$patch((state) => {
              if (!current || !dataEquals(current, data)) {
                state.groups = writeCache(state.groups, groupId, data, PEER_INFO_CACHE_MAX)
              } else {
                state.groups = touchCache(state.groups, groupId)
              }
            })
            return data
          }
          if (res.code !== 0) {
            window.$message.error(res.msg)
          }
          return readCache(this.groups, groupId) ?? cached
        })
        .finally(() => {
          inflight.delete(key)
        })

      inflight.set(key, task)
      return task
    },
    fetchEnterprise(enterpriseId: string): Promise<EnterprisInfo | null> {
      if (!enterpriseId) return Promise.resolve(null)

      const key = `enterprise:${enterpriseId}`
      const pending = inflight.get(key) as Promise<EnterprisInfo | null> | undefined
      if (pending) return pending

      const cached = readCache(this.enterprises, enterpriseId)
      const task = enterpriseApi
        .getEnterpriseInfo({ enterpriseId })
        .then((res) => {
          if (res.code === 0 && res.data) {
            const data = res.data
            const current = readCache(this.enterprises, enterpriseId)
            this.$patch((state) => {
              if (!current || !dataEquals(current, data)) {
                state.enterprises = writeCache(state.enterprises, enterpriseId, data, PEER_INFO_CACHE_MAX)
              } else {
                state.enterprises = touchCache(state.enterprises, enterpriseId)
              }
            })
            return data
          }
          if (res.code !== 0) {
            window.$message.error(res.msg)
          }
          return readCache(this.enterprises, enterpriseId) ?? cached
        })
        .finally(() => {
          inflight.delete(key)
        })

      inflight.set(key, task)
      return task
    }
  }
})
