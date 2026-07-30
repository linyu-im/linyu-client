import { getDb } from '.'

export type SpaceUploadStatus =
  | 'pending'
  | 'hashing'
  | 'checking'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface DbSpaceUpload {
  id: string
  userId: string
  fileName: string
  filePath: string
  fileSize: number
  fileHash?: string
  parentId: string
  parentPath: string
  status: SpaceUploadStatus
  progress: number
  errorMsg?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface InsertSpaceUploadParam {
  id: string
  userId: string
  fileName: string
  filePath: string
  fileSize: number
  parentId: string
  parentPath: string
  status?: SpaceUploadStatus
  progress?: number
  fileHash?: string
  createdAt: string
  updatedAt: string
}

export interface UpdateSpaceUploadParam {
  fileHash?: string | null
  fileSize?: number
  status?: SpaceUploadStatus
  progress?: number
  errorMsg?: string | null
  completedAt?: string | null
  updatedAt: string
}

const SELECT_FIELDS = `id, user_id AS userId, file_name AS fileName, file_path AS filePath,
  file_size AS fileSize, file_hash AS fileHash, parent_id AS parentId, parent_path AS parentPath,
  status, progress, error_msg AS errorMsg, created_at AS createdAt, updated_at AS updatedAt,
  completed_at AS completedAt`

const ACTIVE_STATUSES: SpaceUploadStatus[] = ['pending', 'hashing', 'checking', 'uploading', 'paused', 'failed']

export async function insertSpaceUpload(record: InsertSpaceUploadParam): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_space_upload
      (id, user_id, file_name, file_path, file_size, file_hash, parent_id, parent_path, status, progress, error_msg, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
    [
      record.id,
      record.userId,
      record.fileName,
      record.filePath,
      record.fileSize,
      record.fileHash ?? null,
      record.parentId,
      record.parentPath,
      record.status ?? 'pending',
      record.progress ?? 0,
      record.createdAt,
      record.updatedAt
    ]
  )
}

export async function updateSpaceUpload(id: string, patch: UpdateSpaceUploadParam): Promise<void> {
  const db = await getDb()
  const fields: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [patch.updatedAt]

  if (patch.fileHash !== undefined) {
    fields.push('file_hash = ?')
    values.push(patch.fileHash)
  }
  if (patch.fileSize !== undefined) {
    fields.push('file_size = ?')
    values.push(patch.fileSize)
  }
  if (patch.status !== undefined) {
    fields.push('status = ?')
    values.push(patch.status)
  }
  if (patch.progress !== undefined) {
    fields.push('progress = ?')
    values.push(patch.progress)
  }
  if (patch.errorMsg !== undefined) {
    fields.push('error_msg = ?')
    values.push(patch.errorMsg)
  }
  if (patch.completedAt !== undefined) {
    fields.push('completed_at = ?')
    values.push(patch.completedAt)
  }

  values.push(id)
  await db.execute(`UPDATE t_space_upload SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function querySpaceUploadsByUser(userId: string): Promise<DbSpaceUpload[]> {
  const db = await getDb()
  return db.select<DbSpaceUpload[]>(
    `SELECT ${SELECT_FIELDS}
     FROM t_space_upload
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  )
}

export async function querySpaceUploadById(id: string): Promise<DbSpaceUpload | null> {
  const db = await getDb()
  const rows = await db.select<DbSpaceUpload[]>(`SELECT ${SELECT_FIELDS} FROM t_space_upload WHERE id = ?`, [id])
  return rows[0] ?? null
}

export async function queryActiveSpaceUploads(userId: string): Promise<DbSpaceUpload[]> {
  const db = await getDb()
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ')
  return db.select<DbSpaceUpload[]>(
    `SELECT ${SELECT_FIELDS}
     FROM t_space_upload
     WHERE user_id = ? AND status IN (${placeholders})
     ORDER BY created_at DESC`,
    [userId, ...ACTIVE_STATUSES]
  )
}

export async function deleteSpaceUploadById(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM t_space_upload WHERE id = ?', [id])
}

export async function deleteCompletedSpaceUploads(userId: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_space_upload WHERE user_id = ? AND status IN ('completed', 'cancelled')`, [userId])
}

export async function deleteExpiredCompletedSpaceUploads(userId: string, beforeIso: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM t_space_upload
     WHERE user_id = ?
       AND status IN ('completed', 'cancelled')
       AND COALESCE(completed_at, updated_at) < ?`,
    [userId, beforeIso]
  )
}

export async function markInterruptedUploadsAsPaused(userId: string, updatedAt: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE t_space_upload
     SET status = 'paused', updated_at = ?
     WHERE user_id = ? AND status IN ('pending', 'hashing', 'checking', 'uploading')`,
    [updatedAt, userId]
  )
}
