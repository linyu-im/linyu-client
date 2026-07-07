import type { GroupMember } from './groupMember'

export interface GroupInfoRequest {
  groupId: string
}

export interface GroupSearchParam {
  keyword: string
  page: number
  pageSize: number
}

export interface GroupSearchResult {
  records: Group[]
  total: number
  page: number
  pageSize: number
  totalPage: number
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
