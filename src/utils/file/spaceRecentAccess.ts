import { upsertSpaceRecentAccess } from '@/db/spaceRecentAccess'
import type { SpaceFile } from '@/types/api/space'

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `space-recent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

/** 记录网盘文件预览成功（存在则更新预览时间） */
export const recordSpaceFileRecentAccess = (
  userId: string,
  file: Pick<SpaceFile, 'id' | 'fileName' | 'fileType' | 'fileSize' | 'physicalStoragePath' | 'parentId' | 'path'>
) => {
  if (!userId || !file.id) return Promise.resolve()

  return upsertSpaceRecentAccess({
    id: createId(),
    userId,
    spaceFileId: file.id,
    fileName: file.fileName,
    fileType: file.fileType || '',
    fileSize: Number(file.fileSize) || 0,
    physicalStoragePath: file.physicalStoragePath || '',
    parentId: file.parentId || '',
    path: file.path || '',
    previewedAt: new Date().toISOString()
  }).catch(() => {})
}
