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

  // 网盘上传记录表（按 user_id 隔离）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_space_upload (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_hash TEXT,
      parent_id TEXT NOT NULL,
      parent_path TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0,
      error_msg TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_space_upload_user_id ON t_space_upload(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_space_upload_user_status ON t_space_upload(user_id, status)`)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_space_upload_user_created ON t_space_upload(user_id, created_at DESC)`
  )

  // 网盘下载记录表（按 user_id 隔离）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_space_download (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      space_file_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      download_url TEXT NOT NULL,
      save_path TEXT NOT NULL,
      source_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      loaded_bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0,
      error_msg TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_space_download_user_id ON t_space_download(user_id)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_space_download_user_status ON t_space_download(user_id, status)`)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_space_download_user_created ON t_space_download(user_id, created_at DESC)`
  )

  // 网盘最近访问（按 user_id 隔离，按预览时间排序）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_space_recent_access (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      space_file_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER DEFAULT 0,
      physical_storage_path TEXT,
      parent_id TEXT,
      path TEXT,
      previewed_at TEXT NOT NULL,
      UNIQUE(user_id, space_file_id)
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_space_recent_access_user_id ON t_space_recent_access(user_id)`)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_space_recent_access_user_previewed ON t_space_recent_access(user_id, previewed_at DESC)`
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
export * from './spaceUpload'
export * from './spaceDownload'
export * from './spaceRecentAccess'
