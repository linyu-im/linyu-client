import { emit, emitTo } from '@tauri-apps/api/event'
import { CALL_REMOTE_HANGUP_EVENT, CALL_ROOM_CHANGE_EVENT } from '@/constants/event'
import { CALL_WINDOW_LABEL } from '@/constants/window'
import type { AvCallType, AvCallWsContent, CallInviteWindowPayload } from '@/types/api/avCall'
import type { GroupInfoResult } from '@/types/api/group'
import type { User } from '@/types/api/user'
import { useAvCallStore } from '@/stores/app/avCall'
import { usePeerInfoStore } from '@/stores/user/peerInfo'
import { closeCallInviteWindow, createCallInviteWindow } from '@/utils/desktop/window'

/** 基础校验：action + sessionId；invite 另需 fromId */
const isAvCallWsContent = (value: unknown): value is AvCallWsContent => {
  if (!value || typeof value !== 'object') return false
  const content = value as Record<string, unknown>
  return typeof content.action === 'string' && typeof content.sessionId === 'string'
}

const normalizeCallType = (value: string | undefined): AvCallType => (value === 'audio' ? 'audio' : 'video')

const normalizeSceneType = (value: string | undefined): CallInviteWindowPayload['sceneType'] =>
  value === 'group' ? 'group' : 'user'

const resolveDisplayName = async (fromId: string, sceneType: CallInviteWindowPayload['sceneType']) => {
  const peerInfoStore = usePeerInfoStore()
  if (sceneType === 'group') {
    const group = (await peerInfoStore.fetchGroup(fromId)) as GroupInfoResult | null
    return group?.info?.name?.trim() || fromId
  }
  const user = (await peerInfoStore.fetchUser(fromId)) as User | null
  return user?.remark?.trim() || user?.username?.trim() || fromId
}

const normalizeToUserIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((id) => String(id).trim()).filter(Boolean)
}

const openInviteWindow = async (content: AvCallWsContent) => {
  const sceneType = normalizeSceneType(content.sceneType)
  const callType = normalizeCallType(content.callType)
  const fromId = content.fromId?.trim()
  const sessionId = content.sessionId?.trim()
  if (!fromId || !sessionId) return

  const displayName = await resolveDisplayName(fromId, sceneType)
  await createCallInviteWindow({
    sessionId,
    fromId,
    callType,
    sceneType,
    displayName,
    toUserIds: normalizeToUserIds(content.toUserIds)
  })
}

/** 处理 WS type=call，不影响聊天消息链路 */
export const handleAvCallWs = async (content: unknown) => {
  if (!isAvCallWsContent(content)) {
    console.warn('[AvCallWs] invalid call payload', content)
    return
  }

  const action = content.action.trim().toLowerCase()
  if (action === 'invite') {
    if (typeof content.fromId !== 'string' || !content.fromId.trim()) {
      console.warn('[AvCallWs] invite missing fromId', content)
      return
    }
    await openInviteWindow(content)
    return
  }
  if (action === 'hangup') {
    const sessionId = content.sessionId?.trim()
    await closeCallInviteWindow(sessionId)
    if (sessionId) {
      await emitTo(CALL_WINDOW_LABEL, CALL_REMOTE_HANGUP_EVENT, { sessionId }).catch(() => undefined)
    }
    return
  }
  if (action === 'change') {
    const sessionId = content.sessionId?.trim()
    if (!sessionId) return
    useAvCallStore().notifyRoomChange(sessionId)
    await emit(CALL_ROOM_CHANGE_EVENT, { sessionId }).catch(() => undefined)
  }
}
