import type { GroupMember } from './groupMember'

export interface GroupInfoRequest {
  groupId: string
}

export interface Group {
  id: string
  creatorUserId: string
  groupNumber: string
  ownerUserId: string
  name: string
  avatar: string
  describe: string
  memberNum: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface GroupInfoResult {
  info: Group
  tops: GroupMember[]
}
