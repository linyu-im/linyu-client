/** 空间类型 */
export const SpaceType = {
  /** 个人空间 */
  User: 'user'
} as const

export type SpaceType = (typeof SpaceType)[keyof typeof SpaceType]

/** 空间状态 */
export const SpaceStatus = {
  /** 正常 */
  Active: 'active'
} as const

export type SpaceStatus = (typeof SpaceStatus)[keyof typeof SpaceStatus]

/** 空间根目录 parentId，与后端一致 */
export const SpaceRootParentId = 'root' as const
