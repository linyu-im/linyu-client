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
