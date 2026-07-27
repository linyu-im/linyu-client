import type { UserBadgeCode } from '@/constants/userBadge'

export interface UserBadge {
  userId: string
  badgeCode: UserBadgeCode | string
  lastReadId: string
  updatedAt: string
  unreadCount: number
}

export type UserBadgeListResult = UserBadge[]
