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

/** 空间文件分类 */
export const SpaceFileCategory = {
  Image: 'image',
  Video: 'video',
  Document: 'document',
  Audio: 'audio',
  Archive: 'archive',
  Other: 'other'
} as const

export type SpaceFileCategory = (typeof SpaceFileCategory)[keyof typeof SpaceFileCategory]

/** 网盘默认本地下载目录 */
export const DEFAULT_SPACE_DOWNLOAD_PATH = 'D:/LinyuDownload'
