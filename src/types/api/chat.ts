import type { SceneType } from '@/constants/common'
import { Message } from './message'

export interface Chat {
  id: string
  userId: string
  peerId: string
  sessionId: string
  unreadNum: number
  lastMsgContent: Message | null
  sceneType?: SceneType
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

export interface ChatActiveSessionParam {
  activeSessionId: string
}

export interface ChatDeleteParam {
  chatId: string
}

export interface ChatCreateParam {
  peerId: string
  sceneType: SceneType
}
