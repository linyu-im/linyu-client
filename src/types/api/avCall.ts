export type AvCallType = 'video' | 'audio'

export interface AvCallUserInviteParam {
  userId: string
  callType: AvCallType
}

export interface AvCallUserHangupParam {
  userId: string
}

export interface AvCallGroupInviteParam {
  groupId: string
  callType: AvCallType
  userIds: string[]
}

export interface AvCallGroupHangupParam {
  groupId: string
  userIds: string[]
}

export interface AvCallInviteResult {
  sessionId: string
  callType: AvCallType
  sceneType: string
  userId?: string
  groupId?: string
}

/** WebSocket type=call 的 content */
export interface AvCallWsContent {
  action: 'invite' | 'hangup' | 'change' | string
  sessionId: string
  /** invite 必填；change / hangup 可能缺失 */
  fromId?: string
  callType: AvCallType | string
  sceneType: string
  toUserIds?: string[]
}

/** 通话邀请窗展示/同步载荷 */
export interface CallInviteWindowPayload {
  sessionId: string
  fromId: string
  callType: AvCallType
  sceneType: 'user' | 'group'
  displayName: string
  /** 群聊邀请目标用户 id 列表 */
  toUserIds?: string[]
}
