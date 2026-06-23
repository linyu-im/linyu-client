/** 会话场景类型，与后端一致 */
export const SceneType = {
  /** 用户 */
  User: 'user',
  /** 群 */
  Group: 'group'
} as const

export type SceneType = (typeof SceneType)[keyof typeof SceneType]
