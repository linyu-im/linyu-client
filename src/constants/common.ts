/** 会话场景类型，与后端一致 */
export const SceneType = {
  /** 用户 */
  User: 'user',
  /** 群 */
  Group: 'group'
} as const

export type SceneType = (typeof SceneType)[keyof typeof SceneType]

/** 服务端聊天消息跨窗口广播事件（WS 仅在 home 连接） */
export const CHAT_SERVER_MESSAGE_EVENT = 'chat://server-message'
