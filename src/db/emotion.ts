import type { Emotion } from '@/types/api/emotion'
import { getDb } from './connection'

const EMOTION_SELECT_FIELDS = `id, emotion_name AS emotionName, url, type,
  created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt`

export async function queryEmotions(): Promise<Emotion[]> {
  const db = await getDb()
  return db.select<Emotion[]>(
    `SELECT ${EMOTION_SELECT_FIELDS}
     FROM t_emotion
     ORDER BY id ASC`
  )
}

export async function replaceEmotions(list: Emotion[]): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_emotion`)
  for (const emotion of list) {
    await db.execute(
      `INSERT INTO t_emotion
        (id, emotion_name, url, type, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        emotion.id,
        emotion.emotionName,
        emotion.url,
        emotion.type || '',
        emotion.createdAt || '',
        emotion.updatedAt || '',
        emotion.deletedAt ?? null
      ]
    )
  }
}
