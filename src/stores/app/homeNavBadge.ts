import { defineStore } from 'pinia'
import { userBadgeApi } from '@/api'
import { UserBadgeCode } from '@/constants/userBadge'
import { useAppSettingsStore, type NotificationBadgeSlot } from '@/stores/app/appSettings'
import type { HomeTabId } from '@/stores/app/homeTab'
import type { UserBadge } from '@/types/api/userBadge'

/** 侧栏红点槽位：各 tab + 更多 */
export type HomeNavBadgeSlot = HomeTabId | 'more'

type HomeNavBadgeCounts = Record<HomeNavBadgeSlot, number>

type HomeNavBadgeStore = {
  counts: HomeNavBadgeCounts
  contactsBadges: UserBadge[]
  updatePending: boolean
  shortcutConflict: boolean
}

export const ACTIVE_UPLOAD_STATUSES = new Set(['pending', 'hashing', 'checking', 'uploading', 'paused', 'failed'])
export const ACTIVE_DOWNLOAD_STATUSES = new Set(['pending', 'downloading', 'paused', 'failed'])

const createDefaultCounts = (): HomeNavBadgeCounts => ({
  message: 0,
  contacts: 0,
  moment: 0,
  ai: 0,
  drive: 0,
  application: 0,
  more: 0
})

const sumContactsUnread = (badges: UserBadge[]) => {
  const codes = new Set<string>([UserBadgeCode.NewFriend, UserBadgeCode.GroupNotion])
  return badges.reduce((sum, item) => {
    if (!codes.has(item.badgeCode)) return sum
    return sum + Math.max(0, item.unreadCount || 0)
  }, 0)
}

export const useHomeNavBadgeStore = defineStore('homeNavBadge', {
  persist: {
    pick: []
  },
  share: { enable: true, initialize: true },
  state: (): HomeNavBadgeStore => ({
    counts: createDefaultCounts(),
    contactsBadges: [],
    updatePending: false,
    shortcutConflict: false
  }),
  actions: {
    setCount(slot: HomeNavBadgeSlot, count: number) {
      this.$patch((state) => {
        state.counts[slot] = Math.max(0, count)
      })
    },

    setCounts(counts: Partial<HomeNavBadgeCounts>) {
      this.$patch((state) => {
        for (const [slot, count] of Object.entries(counts) as [HomeNavBadgeSlot, number][]) {
          if (typeof count === 'number') {
            state.counts[slot] = Math.max(0, count)
          }
        }
      })
    },

    isBadgeEnabled(slot: HomeNavBadgeSlot) {
      const appSettings = useAppSettingsStore()
      const badges = appSettings.notifications.badges as Partial<Record<NotificationBadgeSlot, boolean>> | undefined
      if (!badges || badges[slot] === undefined) return true
      return Boolean(badges[slot])
    },

    shouldShowBadge(slot: HomeNavBadgeSlot) {
      return this.isBadgeEnabled(slot) && this.counts[slot] > 0
    },

    refreshMoreCount() {
      this.setCount('more', this.updatePending || this.shortcutConflict ? 1 : 0)
    },

    refreshContactsBadges() {
      return userBadgeApi.list().then((res) => {
        if (res.code === 0 && res.data) {
          this.$patch((state) => {
            state.contactsBadges = res.data || []
            state.counts.contacts = sumContactsUnread(state.contactsBadges)
          })
          return true
        }
        window.$message.error(res.msg)
        return false
      })
    },

    clearContactsBadge(badgeCode: string) {
      const index = this.contactsBadges.findIndex((item) => item.badgeCode === badgeCode)
      if (index === -1 || this.contactsBadges[index].unreadCount === 0) return

      this.$patch((state) => {
        const next = [...state.contactsBadges]
        next[index] = { ...next[index], unreadCount: 0 }
        state.contactsBadges = next
        state.counts.contacts = sumContactsUnread(next)
      })
    },

    syncMessageFromChatList(chatList: Array<{ unreadNum?: number }>) {
      const total = chatList.reduce((sum, item) => sum + Math.max(0, item.unreadNum || 0), 0)
      this.setCount('message', total)
    },

    syncDriveFromTasks(uploadTasks: Array<{ status: string }>, downloadTasks: Array<{ status: string }>) {
      const uploading = uploadTasks.filter((task) => ACTIVE_UPLOAD_STATUSES.has(task.status)).length
      const downloading = downloadTasks.filter((task) => ACTIVE_DOWNLOAD_STATUSES.has(task.status)).length
      this.setCount('drive', uploading + downloading)
    },

    syncMoreFromUpdate(needUpdate: boolean, needForce: boolean) {
      this.$patch((state) => {
        state.updatePending = needUpdate || needForce
      })
      this.refreshMoreCount()
    },

    syncMoreFromShortcutConflict(hasConflict: boolean) {
      this.$patch((state) => {
        state.shortcutConflict = hasConflict
      })
      this.refreshMoreCount()
    }
  }
})
