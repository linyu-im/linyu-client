import type { SceneType } from '@/constants/common'
import type { FromType } from '@/types/common'
import { getDb } from './connection'

/**
 * 数据库消息记录类型
 */
export interface DbMessage {
  id: string
  /** 本地所属用户（多账号隔离） */
  userId: string
  sessionId: string
  fromId: string
  toId: string
  msgType: string
  fromType?: FromType
  isShowTime: number
  content: string
  status?: string
  failReason?: string
  sceneType: SceneType
  quoteMsgId?: string
  keywordContent?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  /** 本地扩展字段（JSON 字符串，仅存本地库） */
  localExt?: string
}

export interface MessageDateRange {
  from: string
  to: string
}

/**
 * 分页查询参数
 */
export interface MessagePageQuery {
  userId: string
  sessionId: string
  page: number
  pageSize: number
  msgType?: string
  dateRange?: MessageDateRange
  /** 按 keyword_content 模糊搜索 */
  keyword?: string
}

/**
 * 分页查询结果
 */
export interface MessagePageResult {
  records: DbMessage[]
  page: number
  pageSize: number
}

/**
 * 跨会话关键词搜索命中（按 session 聚合）
 */
export interface MessageSessionSearchHit {
  sessionId: string
  sceneType: SceneType
  matchCount: number
  latestCreatedAt: string
  latestKeywordContent: string
  latestMsgId: string
}

const MESSAGE_SELECT_FIELDS = `id, user_id AS userId, session_id AS sessionId, from_id AS fromId, to_id AS toId,
  msg_type AS msgType, from_type AS fromType, is_show_time AS isShowTime,
  content, status, scene_type AS sceneType, quote_msg_id AS quoteMsgId,
  keyword_content AS keywordContent,
  created_at AS createdAt, updated_at AS updatedAt, fail_reason AS failReason,
  local_ext AS localExt`

function buildMessageWhereClause(
  userId: string,
  sessionId: string,
  msgType?: string,
  dateRange?: MessageDateRange,
  keyword?: string
) {
  const conditions = ['user_id = ?', 'session_id = ?', 'deleted_at IS NULL']
  const params: (string | number)[] = [userId, sessionId]

  if (msgType) {
    conditions.push('msg_type = ?')
    params.push(msgType)
  }

  if (dateRange) {
    conditions.push('created_at >= ?')
    conditions.push('created_at <= ?')
    params.push(dateRange.from, dateRange.to)
  }

  if (keyword) {
    conditions.push('keyword_content LIKE ?')
    params.push(`%${keyword}%`)
  }

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    params
  }
}

/**
 * 批量插入消息
 * @param messages 消息列表
 */
export async function batchInsertMessages(messages: DbMessage[]): Promise<void> {
  if (messages.length === 0) return

  const db = await getDb()

  const placeholders = messages.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')

  const sql = `
    INSERT OR REPLACE INTO t_message 
    (id, user_id, session_id, from_id, to_id, msg_type, from_type, is_show_time, content, status, scene_type, quote_msg_id, keyword_content, created_at, updated_at, fail_reason, local_ext, deleted_at)
    VALUES ${placeholders}
  `

  const values: (string | number | null)[] = []
  for (const msg of messages) {
    values.push(
      msg.id,
      msg.userId,
      msg.sessionId,
      msg.fromId,
      msg.toId,
      msg.msgType,
      msg.fromType ?? null,
      msg.isShowTime,
      msg.content,
      msg.status ?? null,
      msg.sceneType,
      msg.quoteMsgId ?? null,
      msg.keywordContent ?? null,
      msg.createdAt,
      msg.updatedAt,
      msg.failReason ?? null,
      msg.localExt ?? null,
      msg.deletedAt ?? null
    )
  }

  await db.execute(sql, values)
}

/**
 * 分页查询消息（根据 user_id + session_id）
 * @param query 查询参数
 * @returns 分页结果
 */
export async function queryMessagesByPage(query: MessagePageQuery): Promise<MessagePageResult> {
  const db = await getDb()
  const { userId, sessionId, page, pageSize, msgType, dateRange, keyword } = query
  const offset = (page - 1) * pageSize
  const { clause: whereClause, params: whereParams } = buildMessageWhereClause(
    userId,
    sessionId,
    msgType,
    dateRange,
    keyword
  )

  const records = await db.select<DbMessage[]>(
    `SELECT ${MESSAGE_SELECT_FIELDS}
     FROM t_message
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...whereParams, pageSize, offset]
  )

  return { records, page, pageSize }
}

/**
 * 按 keyword_content 跨会话聚合搜索
 */
export async function searchSessionsByKeyword(userId: string, keyword: string): Promise<MessageSessionSearchHit[]> {
  const trimmed = keyword.trim()
  if (!userId || !trimmed) return []

  const db = await getDb()
  const like = `%${trimmed}%`

  const rows = await db.select<MessageSessionSearchHit[]>(
    `SELECT
       m.session_id AS sessionId,
       m.scene_type AS sceneType,
       agg.matchCount AS matchCount,
       m.created_at AS latestCreatedAt,
       COALESCE(m.keyword_content, '') AS latestKeywordContent,
       m.id AS latestMsgId
     FROM t_message m
     INNER JOIN (
       SELECT session_id, COUNT(*) AS matchCount, MAX(created_at) AS max_created_at
       FROM t_message
       WHERE user_id = ? AND deleted_at IS NULL AND keyword_content LIKE ?
       GROUP BY session_id
     ) agg ON m.session_id = agg.session_id AND m.created_at = agg.max_created_at
     WHERE m.user_id = ? AND m.deleted_at IS NULL AND m.keyword_content LIKE ?
     GROUP BY m.session_id
     ORDER BY m.created_at DESC`,
    [userId, like, userId, like]
  )

  return rows.map((row) => ({
    ...row,
    matchCount: Number(row.matchCount) || 0
  }))
}

/**
 * 软删除指定会话的全部聊天记录
 * @param userId 本地所属用户
 * @param sessionId 会话 ID
 * @param deletedAt 删除时间
 */
export async function softDeleteMessagesBySessionId(
  userId: string,
  sessionId: string,
  deletedAt: string
): Promise<void> {
  const db = await getDb()
  await db.execute('UPDATE t_message SET deleted_at = ? WHERE user_id = ? AND session_id = ? AND deleted_at IS NULL', [
    deletedAt,
    userId,
    sessionId
  ])
}

/**
 * 软删除单条消息
 * @param id 消息 id
 * @param deletedAt 删除时间
 */
export async function softDeleteMessageById(id: string, deletedAt: string): Promise<void> {
  if (!id) return
  const db = await getDb()
  await db.execute('UPDATE t_message SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [deletedAt, id])
}

/**
 * 根据 id 删除消息
 * @param id 消息 id
 */
export async function deleteMessageById(id: string): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM t_message WHERE id = ?', [id])
}

/**
 * 根据 id 列表批量删除消息
 * @param ids 消息 id 列表
 */
export async function batchDeleteMessagesByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const db = await getDb()
  const placeholders = ids.map(() => '?').join(', ')

  await db.execute(`DELETE FROM t_message WHERE id IN (${placeholders})`, ids)
}

/**
 * 根据 id 查询单条消息（排除软删除）
 * @param id 消息 id
 * @returns 消息记录或 null
 */
export async function queryMessageById(id: string): Promise<DbMessage | null> {
  const db = await getDb()

  const result = await db.select<DbMessage[]>(
    `SELECT ${MESSAGE_SELECT_FIELDS}
     FROM t_message WHERE id = ? AND deleted_at IS NULL`,
    [id]
  )

  return result[0] ?? null
}

/**
 * 根据 ids 批量查询消息（排除软删除）
 * @param ids 消息 id 列表
 * @returns 命中的消息记录（未找到或已软删除的 id 不会出现在结果中）
 */
export async function queryMessagesByIds(ids: string[]): Promise<DbMessage[]> {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const db = await getDb()
  const placeholders = uniqueIds.map(() => '?').join(', ')
  return db.select<DbMessage[]>(
    `SELECT ${MESSAGE_SELECT_FIELDS}
     FROM t_message WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    uniqueIds
  )
}

/**
 * 查询指定会话的最新消息 ID
 * @param userId 本地所属用户
 * @param sessionId 会话 ID
 * @returns 最新消息 ID 或 null
 */
export async function queryLatestMessageIdBySession(userId: string, sessionId: string): Promise<string | null> {
  const db = await getDb()

  const result = await db.select<{ id: string }[]>(
    `SELECT id FROM t_message WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 1`,
    [userId, sessionId]
  )

  return result[0]?.id ?? null
}

/**
 * 更新消息本地扩展字段
 */
export async function updateMessageLocalExt(id: string, localExt: string): Promise<void> {
  const db = await getDb()
  await db.execute('UPDATE t_message SET local_ext = ? WHERE id = ?', [localExt, id])
}
