import { emit } from '@tauri-apps/api/event'
import { messageApi } from '@/api'
import { SceneType } from '@/constants/common'
import { CHAT_SERVER_MESSAGE_EVENT } from '@/constants/event'
import { useChatStore } from '@/stores/chat/chat'
import { useMessageDbStore } from '@/stores/message/messageDb'
import { useUserStore } from '@/stores/user/user'
import type { CallRecordCallStatus, CallRecordCallType, CallRecordContent, Message } from '@/types/api/message'
import { buildSessionId } from '@/utils/message/session'

type TranslateFn = (key: string, values?: Record<string, unknown>) => string

/** 通话记录状态文案（气泡内有 icon 时不带类型前缀） */
export const formatCallRecordSummary = (
  content: CallRecordContent,
  t: TranslateFn,
  options?: { withType?: boolean }
): string => {
  let text: string
  switch (content.callStatus) {
    case 'ended':
      text = t('message.callRecord.ended', {
        duration: Math.max(0, Math.floor(Number(content.duration) || 0))
      })
      break
    case 'missed':
      text = t('message.callRecord.missed')
      break
    case 'rejected':
      text = t('message.callRecord.rejected')
      break
    case 'canceled':
      text = t('message.callRecord.canceled')
      break
    default:
      text = t('message.callRecord.fallback')
  }

  // 会话列表 / 提醒等无 icon 场景保留 [语音通话] 前缀
  if (options?.withType) {
    const typeName = content.callType === 'video' ? t('message.callRecord.video') : t('message.callRecord.audio')
    return t('message.callRecord.withType', { type: typeName, text })
  }
  return text
}

/**
 * 按 peer 解析聊天会话 sessionId。
 * 优先用 buildSessionId（副窗 chatList 可能尚未同步），再回退 chatList。
 */
export const resolveChatSessionIdByPeer = (peerId: string, sceneType: 'user' | 'group'): string => {
  const id = peerId?.trim()
  if (!id) return ''

  const scene = sceneType === 'group' ? SceneType.Group : SceneType.User
  const userId = useUserStore().authInfo.userId?.trim() || ''
  if (userId) {
    const built = buildSessionId(id, scene, userId).trim()
    if (built) return built
  }

  const chatStore = useChatStore()
  const chat = chatStore.chatList.find((item) => item.peerId === id && (item.sceneType ?? SceneType.User) === scene)
  return chat?.sessionId?.trim() || ''
}

/** 将服务端消息同步到会话列表 / 本地库 / 聊天窗（对齐 WS receiveMsg） */
const syncSentCallRecord = (msg: Message) => {
  useMessageDbStore().saveMessages([msg])
  useChatStore().onReceiveMessage(msg)
  void emit(CHAT_SERVER_MESSAGE_EVENT, msg)
}

/** 发送通话记录消息（失败不抛、不阻断关窗） */
export const sendCallRecordMsg = (input: {
  chatSessionId: string
  callType: CallRecordCallType | string
  callStatus: CallRecordCallStatus | string
  duration?: number
}): Promise<void> => {
  const sessionId = input.chatSessionId?.trim()
  if (!sessionId) {
    console.warn('[callRecord] skip send: empty chatSessionId')
    return Promise.resolve()
  }

  return messageApi
    .sendMsg({
      sessionId,
      msgType: 'call_record',
      content: {
        duration: Math.max(0, Math.floor(Number(input.duration) || 0)),
        callType: input.callType === 'video' ? 'video' : 'audio',
        callStatus: input.callStatus
      },
      isShowTime: false
    })
    .then((res) => {
      if (res.code === 0 && res.data) {
        syncSentCallRecord(res.data)
        return
      }
      console.warn('[callRecord] send failed', res.code, res.msg)
    })
    .catch((err) => {
      console.warn('[callRecord] send error', err)
    })
}
