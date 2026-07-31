import { getDb } from '.'

export type SpaceDownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface DbSpaceDownload {
  id: string
  userId: string
  spaceFileId: string
  fileName: string
  downloadUrl: string
  savePath: string
  sourcePath: string
  fileSize: number
  loadedBytes: number
  status: SpaceDownloadStatus
  progress: number
  errorMsg?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface InsertSpaceDownloadParam {
  id: string
  userId: string
  spaceFileId: string
  fileName: string
  downloadUrl: string
  savePath: string
  sourcePath: string
  fileSize: number
  loadedBytes?: number
  status?: SpaceDownloadStatus
  progress?: number
  createdAt: string
  updatedAt: string
}

export interface UpdateSpaceDownloadParam {
  savePath?: string
  fileSize?: number
  loadedBytes?: number
  status?: SpaceDownloadStatus
  progress?: number
  errorMsg?: string | null
  completedAt?: string | null
  updatedAt: string
}

const SELECT_FIELDS = `id, user_id AS userId, space_file_id AS spaceFileId, file_name AS fileName,
  download_url AS downloadUrl, save_path AS savePath, source_path AS sourcePath,
  file_size AS fileSize, loaded_bytes AS loadedBytes, status, progress,
  error_msg AS errorMsg, created_at AS createdAt, updated_at AS updatedAt,
  completed_at AS completedAt`

const ACTIVE_STATUSES: SpaceDownloadStatus[] = ['pending', 'downloading', 'paused', 'failed']

export async function insertSpaceDownload(record: InsertSpaceDownloadParam): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_space_download
      (id, user_id, space_file_id, file_name, download_url, save_path, source_path,
       file_size, loaded_bytes, status, progress, error_msg, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
    [
      record.id,
      record.userId,
      record.spaceFileId,
      record.fileName,
      record.downloadUrl,
      record.savePath,
      record.sourcePath,
      record.fileSize,
      record.loadedBytes ?? 0,
      record.status ?? 'pending',
      record.progress ?? 0,
      record.createdAt,
      record.updatedAt
    ]
  )
}

export async function updateSpaceDownload(id: string, patch: UpdateSpaceDownloadParam): Promise<void> {
  const db = await getDb()
  const fields: string[] = ['updated_at = ?']
  const values: (string | number | null)[] = [patch.updatedAt]

  if (patch.savePath !== undefined) {
    fields.push('save_path = ?')
    values.push(patch.savePath)
  }
  if (patch.fileSize !== undefined) {
    fields.push('file_size = ?')
    values.push(patch.fileSize)
  }
  if (patch.loadedBytes !== undefined) {
    fields.push('loaded_bytes = ?')
    values.push(patch.loadedBytes)
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
  await db.execute(`UPDATE t_space_download SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function querySpaceDownloadsByUser(userId: string): Promise<DbSpaceDownload[]> {
  const db = await getDb()
  return db.select<DbSpaceDownload[]>(
    `SELECT ${SELECT_FIELDS}
     FROM t_space_download
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  )
}

export async function queryActiveSpaceDownloads(userId: string): Promise<DbSpaceDownload[]> {
  const db = await getDb()
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ')
  return db.select<DbSpaceDownload[]>(
    `SELECT ${SELECT_FIELDS}
     FROM t_space_download
     WHERE user_id = ? AND status IN (${placeholders})
     ORDER BY created_at DESC`,
    [userId, ...ACTIVE_STATUSES]
  )
}

export async function deleteSpaceDownloadById(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM t_space_download WHERE id = ?', [id])
}

export async function deleteCompletedSpaceDownloads(userId: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_space_download WHERE user_id = ? AND status IN ('completed', 'cancelled')`, [userId])
}

export async function deleteExpiredCompletedSpaceDownloads(userId: string, beforeIso: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM t_space_download
     WHERE user_id = ?
       AND status IN ('completed', 'cancelled')
       AND COALESCE(completed_at, updated_at) < ?`,
    [userId, beforeIso]
  )
}

export async function markInterruptedDownloadsAsPaused(userId: string, updatedAt: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    `UPDATE t_space_download
     SET status = 'paused', updated_at = ?
     WHERE user_id = ? AND status IN ('pending', 'downloading')`,
    [updatedAt, userId]
  )
}
