import Database from '@tauri-apps/plugin-sql'
import { appDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import { mkdir } from '@tauri-apps/plugin-fs'

const DB_RELATIVE_DIR = 'data'
const DB_FILE_NAME = 'linyu.db'

let dbInstance: Database | null = null
let dbPathPromise: Promise<string> | null = null

/**
 * 获取数据库绝对路径（存放在 appDataDir/data 目录下）
 */
async function getDbPath(): Promise<string> {
  if (!dbPathPromise) {
    dbPathPromise = (async () => {
      await mkdir(DB_RELATIVE_DIR, { baseDir: BaseDirectory.AppData, recursive: true })
      const dataDir = await appDataDir()
      const dbPath = await join(dataDir, DB_RELATIVE_DIR, DB_FILE_NAME)
      return dbPath.replace(/\\/g, '/')
    })()
  }

  return dbPathPromise
}

/**
 * 获取数据库实例（单例模式）
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = await getDbPath()
  dbInstance = await Database.load(`sqlite:${dbPath}`)
  return dbInstance
}

/**
 * 初始化数据库表结构
 * 在应用启动时调用，确保所有表存在
 */
export async function initDatabase(): Promise<void> {
  const db = await getDb()

  // 创建消息表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_message (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      msg_type TEXT,
      from_type TEXT,
      is_show_time INTEGER DEFAULT 0,
      content TEXT,
      status TEXT,
      scene_type TEXT NOT NULL,
      quote_msg_id TEXT,
      keyword_content TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      fail_reason TEXT,
      local_ext TEXT,
      deleted_at TEXT
    )
  `)

  // 创建索引
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_message_session_id ON t_message(session_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_message_user_id ON t_message(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_message_from_id ON t_message(from_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_message_to_id ON t_message(to_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_message_session_created ON t_message(session_id, created_at DESC)`)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_message_user_session_created ON t_message(user_id, session_id, created_at DESC)`
  )
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_message_session_type_created ON t_message(session_id, msg_type, created_at DESC)`
  )
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}

// 导出所有数据库操作
export * from './message'
