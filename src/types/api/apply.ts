import type { ApplySourceEnum } from '@/constants/apply'

export interface ApplyAddFriendParam {
  peerId: string
  describe: string
  applySource: ApplySourceEnum
}

export interface ApplyAddGroupParam {
  groupId: string
  describe: string
  applySource: ApplySourceEnum
}

export interface ApplyAgreeFriendParam {
  applyId: string
}

export interface ApplyRejectParam {
  applyId: string
}

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
