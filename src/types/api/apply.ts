import type { ApplySourceEnum } from '@/constants/apply'

export interface Apply {
  id: string
  userId: string
  peerId: string
  type: string
  applySource: ApplySourceEnum | string
  describe: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  peerName: string
  userName?: string
}

export type FriendApplyListResult = Apply[]

export type GroupApplyListResult = Apply[]
