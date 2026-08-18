import { getDb } from './connection'

export interface DbSpaceRecentAccess {
  id: string
  userId: string
  spaceFileId: string
  fileName: string
  fileType: string
  fileSize: number
  physicalStoragePath: string
  parentId: string
  path: string
  previewedAt: string
}

export interface UpsertSpaceRecentAccessParam {
  id: string
  userId: string
  spaceFileId: string
  fileName: string
  fileType: string
  fileSize: number
  physicalStoragePath: string
  parentId: string
  path: string
  previewedAt: string
}

const SELECT_FIELDS = `id, user_id AS userId, space_file_id AS spaceFileId, file_name AS fileName,
  file_type AS fileType, file_size AS fileSize, physical_storage_path AS physicalStoragePath,
  parent_id AS parentId, path, previewed_at AS previewedAt`

/** 每个用户最多保留的最近访问条数 */
export const SPACE_RECENT_ACCESS_KEEP_LIMIT = 100

export async function upsertSpaceRecentAccess(record: UpsertSpaceRecentAccessParam): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_space_recent_access
      (id, user_id, space_file_id, file_name, file_type, file_size, physical_storage_path,
       parent_id, path, previewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, space_file_id) DO UPDATE SET
       file_name = excluded.file_name,
       file_type = excluded.file_type,
       file_size = excluded.file_size,
       physical_storage_path = excluded.physical_storage_path,
       parent_id = excluded.parent_id,
       path = excluded.path,
       previewed_at = excluded.previewed_at`,
    [
      record.id,
      record.userId,
      record.spaceFileId,
      record.fileName,
      record.fileType,
      record.fileSize,
      record.physicalStoragePath,
      record.parentId,
      record.path,
      record.previewedAt
    ]
  )

  // 超出上限时删除更早的记录
  await db.execute(
    `DELETE FROM t_space_recent_access
     WHERE rowid IN (
       SELECT rowid FROM t_space_recent_access
       WHERE user_id = ?
       ORDER BY previewed_at DESC
       LIMIT -1 OFFSET ?
     )`,
    [record.userId, SPACE_RECENT_ACCESS_KEEP_LIMIT]
  )
}

export async function querySpaceRecentAccessByUser(
  userId: string,
  limit = SPACE_RECENT_ACCESS_KEEP_LIMIT
): Promise<DbSpaceRecentAccess[]> {
  const db = await getDb()
  return db.select<DbSpaceRecentAccess[]>(
    `SELECT ${SELECT_FIELDS}
     FROM t_space_recent_access
     WHERE user_id = ?
     ORDER BY previewed_at DESC
     LIMIT ?`,
    [userId, Math.max(1, limit)]
  )
}

export async function deleteSpaceRecentAccessByIds(userId: string, spaceFileIds: string[]): Promise<void> {
  if (spaceFileIds.length === 0) return
  const db = await getDb()
  const placeholders = spaceFileIds.map(() => '?').join(', ')
  await db.execute(`DELETE FROM t_space_recent_access WHERE user_id = ? AND space_file_id IN (${placeholders})`, [
    userId,
    ...spaceFileIds
  ])
}

export async function clearSpaceRecentAccess(userId: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_space_recent_access WHERE user_id = ?`, [userId])
}
