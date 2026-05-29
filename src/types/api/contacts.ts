export interface Contact {
  id: string
  userId: string
  peerId: string
  remark: string
  isBack: boolean
  isTop: boolean
  isConcern: boolean
  isMute: boolean
  type: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  username: string
  userLevel: number
  emotionName: string
  emotionUrl: string
}

export type ContactsListResult = Contact[]

export type ContactsMenuView = 'newFriend' | 'groupNotice' | 'groupProfile' | 'friendProfile'

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
