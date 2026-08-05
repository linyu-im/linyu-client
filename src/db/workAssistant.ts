import { getDb } from './index'

export interface WorkConversationRecord {
  id: string
  title: string
  runtimeId: string
  providerId: string
  model: string
  workspacePath: string
  scopeMode: 'chat' | 'workspace'
  createdAt: string
  updatedAt: string
}

export interface WorkMessageRecord {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  runId: string
  attachments: WorkAttachmentRecord[]
  createdAt: string
}

export interface WorkAttachmentRecord {
  id: string
  messageId: string
  conversationId: string
  name: string
  path: string
  mimeType: string
  size: number
  category: 'image' | 'document' | 'spreadsheet' | 'pdf' | 'archive' | 'other'
  createdAt: string
}

export interface WorkStepRecord {
  id: string
  conversationId: string
  runId: string
  title: string
  kind: string
  status: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled'
  detail: string
  payloadJson: string
  sequence: number
  startedAt: string
  completedAt: string
}

export async function listWorkConversations(): Promise<WorkConversationRecord[]> {
  const db = await getDb()
  return db.select<WorkConversationRecord[]>(`
    SELECT id, title, runtime_id AS runtimeId, provider_id AS providerId, model,
      workspace_path AS workspacePath, scope_mode AS scopeMode,
      created_at AS createdAt, updated_at AS updatedAt
    FROM t_work_conversation
    ORDER BY COALESCE(
      (SELECT MAX(m.created_at) FROM t_work_message m WHERE m.conversation_id = t_work_conversation.id),
      updated_at
    ) DESC
  `)
}

export async function upsertWorkConversation(record: WorkConversationRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_work_conversation
      (id, title, runtime_id, provider_id, model, workspace_path, scope_mode, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, runtime_id=excluded.runtime_id,
      provider_id=excluded.provider_id, model=excluded.model, workspace_path=excluded.workspace_path,
      scope_mode=excluded.scope_mode,
      updated_at=excluded.updated_at`,
    [
      record.id,
      record.title,
      record.runtimeId,
      record.providerId,
      record.model,
      record.workspacePath,
      record.scopeMode,
      record.createdAt,
      record.updatedAt
    ]
  )
}

export async function listWorkMessages(conversationId: string): Promise<WorkMessageRecord[]> {
  const db = await getDb()
  const messages = await db.select<Array<Omit<WorkMessageRecord, 'attachments'>>>(
    `
    SELECT id, conversation_id AS conversationId, role, content, run_id AS runId, created_at AS createdAt
    FROM t_work_message WHERE conversation_id = ? ORDER BY created_at ASC
  `,
    [conversationId]
  )
  const attachments = await db.select<WorkAttachmentRecord[]>(
    `SELECT id, message_id AS messageId, conversation_id AS conversationId, name, path,
      mime_type AS mimeType, size, category, created_at AS createdAt
     FROM t_work_message_attachment WHERE conversation_id = ? ORDER BY created_at ASC`,
    [conversationId]
  )
  return messages.map((message) => ({
    ...message,
    attachments: attachments.filter((attachment) => attachment.messageId === message.id)
  }))
}

export async function saveWorkMessage(record: WorkMessageRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO t_work_message (id, conversation_id, role, content, run_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [record.id, record.conversationId, record.role, record.content, record.runId, record.createdAt]
  )
  await db.execute('DELETE FROM t_work_message_attachment WHERE message_id = ?', [record.id])
  for (const attachment of record.attachments) {
    await db.execute(
      `INSERT INTO t_work_message_attachment
        (id, message_id, conversation_id, name, path, mime_type, size, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attachment.id,
        record.id,
        record.conversationId,
        attachment.name,
        attachment.path,
        attachment.mimeType,
        attachment.size,
        attachment.category,
        attachment.createdAt
      ]
    )
  }
}

export async function listWorkSteps(conversationId: string): Promise<WorkStepRecord[]> {
  const db = await getDb()
  return db.select<WorkStepRecord[]>(
    `SELECT id, conversation_id AS conversationId, run_id AS runId, title, kind, status, detail,
      payload_json AS payloadJson, sequence, started_at AS startedAt, completed_at AS completedAt
     FROM t_work_step WHERE conversation_id = ? ORDER BY sequence ASC, started_at ASC`,
    [conversationId]
  )
}

export async function saveWorkStep(record: WorkStepRecord): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_work_step
      (id, conversation_id, run_id, title, kind, status, detail, payload_json, sequence, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, kind=excluded.kind, status=excluded.status,
      detail=excluded.detail, payload_json=excluded.payload_json, sequence=excluded.sequence,
      completed_at=excluded.completed_at`,
    [
      record.id,
      record.conversationId,
      record.runId,
      record.title,
      record.kind,
      record.status,
      record.detail,
      record.payloadJson,
      record.sequence,
      record.startedAt,
      record.completedAt
    ]
  )
}

export async function deleteWorkConversation(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM t_work_step WHERE conversation_id = ?', [id])
  await db.execute('DELETE FROM t_work_message_attachment WHERE conversation_id = ?', [id])
  await db.execute('DELETE FROM t_work_message WHERE conversation_id = ?', [id])
  await db.execute('DELETE FROM t_work_conversation WHERE id = ?', [id])
}
