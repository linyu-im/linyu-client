export interface Contact {
  id: string
  userId: string
  peerId: string
  remark: string
  tag: string
  isBack: boolean
  isTop: boolean
  isConcern: boolean
  isMute: boolean
  peerType: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  username: string
  account?: string
  userLevel: number
  emotionName: string
  emotionUrl: string
  groupName?: string
  name?: string
  groupNumber?: string
  group_number?: string
  groupMemberNum?: number
  enterpriseName?: string
  enterpriseMemberNum?: number
}

export interface ContactsFriendIsParam {
  userId: string
}

export interface ContactsRemarkUpdateParam {
  peerId: string
  remark: string
}

export interface ContactsTagUpdateParam {
  peerId: string
  tag: string
}

export type ContactsListResult = Contact[]

export interface ContactsSearchResult {
  friends: Contact[]
  groups: Contact[]
}

export type ContactsMenuView =
  | 'empty'
  | 'newFriend'
  | 'groupNotice'
  | 'groupProfile'
  | 'friendProfile'
  | 'enterpriseProfile'

export interface ContactsSectionEntry {
  id: string
  name: string
  avatarId: string
  sub: string
  view: ContactsMenuView
  code: string
}

export interface ContactsNewFriendItem {
  id: string
  avatarId: string
  name: string
  sourceKey: string
  time: string
  message: string
  status: 'pending' | 'done'
}

export interface ContactsGroupNoticeItem {
  id: string
  avatarId: string
  name: string
  time: string
  message: string
}
