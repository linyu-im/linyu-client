/** 可见性：all / private / include / exclude */
export type MomentVisibleType = 'all' | 'private' | 'include' | 'exclude'

export interface MomentMediaItem {
  url: string
  thumbUrl: string
  mediaType: string
  sort: number
}

export interface Moment {
  id: string
  userId: string
  textContent: string
  mediaType: MomentMediaItem[] | null
  VisibleType: MomentVisibleType
  location: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  username: string
  userLevel: number
}

export interface MomentComment {
  id: string
  momentId: string
  userId: string
  replyUserId: string
  replyUsername: string
  parentId: string
  content: string
  createdAt: string
  username: string
}

export interface MomentLike {
  id: string
  momentId: string
  userId: string
  createdAt: string
  username: string
}

export interface MomentRecord {
  moment: Moment
  comments: MomentComment[] | null
  likes: MomentLike[] | null
}

export interface MomentLikeParam {
  momentId: string
}

export interface MomentDeleteParam {
  momentId: string
}

export interface MomentCommentAddParam {
  momentId: string
  content: string
  parentId?: string
}

export interface MomentCommentDelParam {
  commentId: string
}

export interface MomentPageParam {
  page: number
  PageSize: number
  viewUserId?: string
}

export interface MomentCreateMediaItem {
  url: string
  thumbUrl: string
  mediaType: string
  Sort: number
}

export interface MomentCreateParam {
  textContent: string
  MediaContent?: MomentCreateMediaItem[]
  visibleType: MomentVisibleType
  visibleUserIds?: string[]
  location?: string
}

export interface MomentPageResult {
  records: MomentRecord[]
  total: number
  page: number
  pageSize: number
  totalPage: number
}

/** 页面展示用 */
export type MomentFilter = 'all' | 'special' | 'mine'

export interface MomentProfile {
  coverUrl: string
  signature: string
}

export interface MomentSettingResult {
  UserID: string
  bgUrl: string
  /** 允许好友查看过往的天数；0=永久，-1=不可见 */
  expireDays?: number
  /** 兼容旧字段名 */
  ExpireDays?: number
  CreatedAt: string
  UpdatedAt: string
}

export interface MomentSettingGetParam {
  userId: string
}

export interface MomentExpireDaysParam {
  expireDays: number
}
