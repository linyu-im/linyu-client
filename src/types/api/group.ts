import type { GroupMember } from './groupMember'

export interface GroupInfoRequest {
  groupId: string
}

export interface GroupUpdateInfoParam {
  groupId: string
  name: string
  describe: string
  tag: string
}

export interface GroupCreateParam {
  groupMemberList: string[]
}

export interface GroupInviteMemberParam {
  groupId: string
  groupMemberList: string[]
}

export interface GroupRemoveMemberParam {
  groupId: string
  groupMemberList: string[]
}

export interface GroupSetAdminParam {
  groupId: string
  addAdminList: string[]
  removeAdminList: string[]
}

export interface GroupTransferOwnerParam {
  groupId: string
  newOwnerId: string
}

export interface GroupNoticeAddParam {
  groupId: string
  content: string
  isTop: boolean
}

export interface GroupNoticeUpdateParam {
  noticeId: string
  content: string
  isTop: boolean
}

export interface GroupNoticeDeleteParam {
  noticeId: string
}

export interface GroupNotice {
  id: string
  groupId: string
  publisherUserId: string
  content: string
  isTop: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
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
  groupNoticeContent: string | null
  deletedAt: string | null
}

export interface GroupInfoResult {
  info: Group
  tops: GroupMember[]
}
