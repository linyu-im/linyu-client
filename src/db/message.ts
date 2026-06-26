import type { SceneType } from '@/constants/common'
import type { FromType } from '@/types/common'
import { getDb } from '.'

/**
 * 数据库消息记录类型
 */
export interface DbMessage {
  id: string
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
  createdAt: string
  updatedAt: string
}

/**
 * 分页查询参数
 */
export interface MessagePageQuery {
  sessionId: string
  page: number
  pageSize: number
}

/**
 * 分页查询结果
 */
export interface MessagePageResult {
  records: DbMessage[]
  total: number
  page: number
  pageSize: number
}

/**
 * 批量插入消息
 * @param messages 消息列表
 */
export async function batchInsertMessages(messages: DbMessage[]): Promise<void> {
  if (messages.length === 0) return

  const db = await getDb()

  const placeholders = messages.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')

  const sql = `
    INSERT OR REPLACE INTO t_message 
    (id, session_id, from_id, to_id, msg_type, from_type, is_show_time, content, status, scene_type, quote_msg_id, created_at, updated_at, fail_reason)
    VALUES ${placeholders}
  `

  const values: (string | number | null)[] = []
  for (const msg of messages) {
    values.push(
      msg.id,
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
      msg.createdAt,
      msg.updatedAt,
      msg.failReason ?? null
    )
  }

  await db.execute(sql, values)
}

/**
 * 分页查询消息（根据 session_id）
 * @param query 查询参数
 * @returns 分页结果
 */
export async function queryMessagesByPage(query: MessagePageQuery): Promise<MessagePageResult> {
  const db = await getDb()
  const { sessionId, page, pageSize } = query
  const offset = (page - 1) * pageSize

  // 查询总数
  const countResult = await db.select<{ total: number }[]>(
    'SELECT COUNT(*) as total FROM t_message WHERE session_id = ?',
    [sessionId]
  )
  const total = countResult[0]?.total ?? 0

  // 查询分页数据
  const records = await db.select<DbMessage[]>(
    `SELECT id, session_id AS sessionId, from_id AS fromId, to_id AS toId,
            msg_type AS msgType, from_type AS fromType, is_show_time AS isShowTime,
            content, status, scene_type AS sceneType, quote_msg_id AS quoteMsgId,
            created_at AS createdAt, updated_at AS updatedAt, fail_reason AS failReason
     FROM t_message 
     WHERE session_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [sessionId, pageSize, offset]
  )

  return {
    records,
    total,
    page,
    pageSize
  }
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
 * 根据 id 查询单条消息
 * @param id 消息 id
 * @returns 消息记录或 null
 */
export async function queryMessageById(id: string): Promise<DbMessage | null> {
  const db = await getDb()

  const result = await db.select<DbMessage[]>(
    `SELECT id, session_id AS sessionId, from_id AS fromId, to_id AS toId,
            msg_type AS msgType, from_type AS fromType, is_show_time AS isShowTime,
            content, status, scene_type AS sceneType, quote_msg_id AS quoteMsgId,
            created_at AS createdAt, updated_at AS updatedAt, fail_reason AS failReason
     FROM t_message WHERE id = ?`,
    [id]
  )

  return result[0] ?? null
}

/**
 * 查询指定会话的最新消息 ID
 * @param sessionId 会话 ID
 * @returns 最新消息 ID 或 null
 */
export async function queryLatestMessageIdBySession(sessionId: string): Promise<string | null> {
  const db = await getDb()

  const result = await db.select<{ id: string }[]>(
    `SELECT id FROM t_message WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
    [sessionId]
  )

  return result[0]?.id ?? null
}
