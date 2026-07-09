import type { Chat } from '@/types/api/chat'
import { SceneType } from '@/constants/common'
import { useChatRecordStore } from '@/stores/chat/chatRecord'
import { createChatRecordWindow } from '@/utils/window'

export const openChatRecord = (chat: Chat) => {
  const chatRecordStore = useChatRecordStore()
  const peerName = chat.peerRemark || chat.peerName || ''
  chatRecordStore.openRecord(chat.sessionId, chat.peerId, peerName, chat.sceneType ?? SceneType.User)
  createChatRecordWindow()
}
