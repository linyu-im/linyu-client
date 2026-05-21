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
}

export interface MomentComment {
  id: string
  momentId: string
  userId: string
  replyUserId: string
  parentId: string
  content: string
  createdAt: string
  username: string
  userAvatar: string
}

export interface MomentLike {
  id: string
  momentId: string
  userId: string
  createdAt: string
  username: string
  userAvatar: string
}

export interface MomentRecord {
  moment: Moment
  comments: MomentComment[] | null
  likes: MomentLike[] | null
}

export interface MomentPageParam {
  page: number
  PageSize: number
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

export interface MomentAuthor {
  id: string
  name: string
}

export interface MomentPostComment {
  id: string
  author: MomentAuthor
  text: string
  replyTo?: string
  time: string
  likeCount: number
  liked?: boolean
}

export interface MomentMedia {
  url: string
  thumbUrl?: string
  isVideo?: boolean
}

export interface MomentPost {
  id: string
  author: MomentAuthor
  time: string
  visibility: MomentVisibleType
  content: string
  images?: MomentMedia[]
  location?: string
  likeCount: number
  commentCount: number
  liked: boolean
  likeAuthors: MomentAuthor[]
  comments: MomentPostComment[]
  isMine?: boolean
}

export interface MomentProfile {
  coverUrl: string
  signature: string
}
