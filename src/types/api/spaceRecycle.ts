/** 用户空间回收站列表项 */
export interface SpaceRecycle {
  id: string
  userId: string
  spaceId: string
  spaceFileId: string
  deletedBy: string
  expireAt: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  fileName: string
  isDir: boolean
  fileType: string
  fileSize: number
}

export interface SpaceUserRecycleRestoreParam {
  spaceRecycleIds: string[]
}

export interface SpaceUserRecycleDeleteParam {
  spaceRecycleIds: string[]
}
