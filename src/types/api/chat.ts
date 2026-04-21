import { Message } from './message'

export interface Chat {
  id: string
  userId: string
  peerId: string
  unreadNum: number
  lastMsgContent: Message | null
  type?: string
  status?: string
  updatedAt: string
  createdAt: string

  peerName?: string
  peerAvatar?: string
  peerRemark?: string
  peerIsTop?: boolean
  peerIsMute?: boolean
}

export interface ChatTopParam {
  chatId: string
  isTop: boolean
}

export interface ChatMuteParam {
  chatId: string
  isMute: boolean
}

export interface ChatMarkReadParam {
  chatId: string
}

export interface ChatDeleteParam {
  chatId: string
}
