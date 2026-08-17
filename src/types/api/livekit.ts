/** LiveKit 服务信息 */
export interface LivekitInfoResult {
  enabled: boolean
  host: string
}

export interface LivekitTokenParam {
  sessionId: string
}

/** 入会 token（data 为 JWT 字符串） */
export type LivekitTokenResult = string

/** 查询房间在线用户 */
export interface LivekitRoomUsersParam {
  sessionId: string
}

export interface LivekitRoomUser {
  userId: string
  username: string
  avatar: string
  /** 在线状态 */
  state: number
}

export type LivekitRoomUsersResult = LivekitRoomUser[]
