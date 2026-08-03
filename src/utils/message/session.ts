import { SceneType } from '@/constants/common'

/** sessionId 前缀：`user_` / `group_` */
export function sessionIdPrefix(sceneType: string): string {
  return `${sceneType}_`
}

/** 单聊：`user_{minId}_{maxId}` */
export function generate1v1SessionId(id1: string, id2: string): string {
  const prefix = sessionIdPrefix(SceneType.User)
  if (id1 < id2) {
    return `${prefix}${id1}_${id2}`
  }
  return `${prefix}${id2}_${id1}`
}

/** 群聊：`group_{groupId}` */
export function generateGroupSessionId(groupId: string): string {
  return `${sessionIdPrefix(SceneType.Group)}${groupId}`
}

/**
 * 按场景类型生成 sessionId
 * - user: `user_{minId}_{maxId}`
 * - group: `group_{peerId}`
 */
export function generateSessionId(userId: string, peerId: string, sceneType: string): string {
  switch (sceneType) {
    case SceneType.User:
      return generate1v1SessionId(userId, peerId)
    case SceneType.Group:
      return generateGroupSessionId(peerId)
    default:
      return ''
  }
}

/** 兼容旧调用：peerId + sceneType + currentUserId → sessionId */
export function buildSessionId(peerId: string, peerSceneType: string, currentUserId: string): string {
  return generateSessionId(currentUserId, peerId, peerSceneType)
}

/** 从 sessionId 解析场景类型 */
export function getSessionSceneType(sessionId: string): string {
  const userPrefix = sessionIdPrefix(SceneType.User)
  const groupPrefix = sessionIdPrefix(SceneType.Group)
  if (sessionId.startsWith(userPrefix)) return SceneType.User
  if (sessionId.startsWith(groupPrefix)) return SceneType.Group
  return ''
}

/** 解析单聊 sessionId，返回两个用户 id */
export function split1v1SessionId(sessionId: string): string[] | null {
  const prefix = sessionIdPrefix(SceneType.User)
  if (!sessionId.startsWith(prefix)) return null
  const body = sessionId.slice(prefix.length)
  const parts = body.split('_')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return parts
}

/** 从单聊 sessionId 中取出对方用户 id */
export function getPeerIdFromUserSession(sessionId: string, userId: string): string {
  const ids = split1v1SessionId(sessionId)
  if (!ids || ids.length !== 2) return ''
  if (ids[0] === userId) return ids[1] || ''
  if (ids[1] === userId) return ids[0] || ''
  return ''
}

/** 从群聊 sessionId 中取出群 id */
export function getGroupIdFromSessionId(sessionId: string): string {
  const prefix = sessionIdPrefix(SceneType.Group)
  if (!sessionId.startsWith(prefix)) return ''
  const groupId = sessionId.slice(prefix.length)
  if (!groupId || groupId.includes('_')) return ''
  return groupId
}
