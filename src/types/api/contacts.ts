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
