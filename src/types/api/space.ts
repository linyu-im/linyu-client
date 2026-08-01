import type { SpaceFileCategory, SpaceStatus, SpaceType } from '@/constants/space'

export interface Space {
  id: string
  spaceType: SpaceType | string
  targetId: string
  ownerId: string
  spaceName: string
  quotaBytes: number
  usedBytes: number
  fileCount: number
  folderCount: number
  status: SpaceStatus | string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type SpaceUserInfoResult = Space

export interface SpaceUserFileListParam {
  parentId: string
}

export interface SpaceUserDirCreateParam {
  parentId: string
  dirName: string
}

export interface SpaceUserFileDeleteParam {
  spaceFileIDs: string[]
}

export interface SpaceUserFileMoveParam {
  spaceFileIds: string[]
  targetParentId: string
}

export interface SpaceUserFileRenameParam {
  spaceFileId: string
  newName: string
}

/** 空间文件分类统计项 */
export interface SpaceUserFileCategoryStat {
  fileCategory: SpaceFileCategory | string
  fileCount: number
  totalSize: number
}

/** 空间文件/目录项 */
export interface SpaceFile {
  id: string
  spaceId: string
  userId: string
  physicalId: string
  physicalStoragePath: string
  parentId: string
  path: string
  level: number
  fileName: string
  isDir: boolean
  fileType: string
  fileSize: number
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

/** 用户空间文件夹目录树节点 */
export interface SpaceUserDirTreeNode {
  id: string
  fileName: string
  parentId: string
  path: string
  level: number
  children: SpaceUserDirTreeNode[]
}

export interface SpaceUserFileDetailParam {
  spaceFileId: string
}

export interface SpaceUserFileDetailResult {
  id: string
  fileName: string
  isDir: boolean
  fileType: string
  fileCategory: string
  location: string
  size: number
  contains: {
    fileCount: number
    folderCount: number
  }
  updatedAt: string
}
