/** 获取 LiveKit 服务地址（data 为 host/url 字符串） */
export type LivekitHostResult = string

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
