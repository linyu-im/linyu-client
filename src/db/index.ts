import Database from '@tauri-apps/plugin-sql'
import { appLocalDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import { mkdir } from '@tauri-apps/plugin-fs'

const DB_RELATIVE_DIR = 'data'
const DB_FILE_NAME = 'linyu.db'

let dbInstance: Database | null = null
let dbPathPromise: Promise<string> | null = null
let dbLoadPromise: Promise<Database> | null = null
let schemaReadyPromise: Promise<void> | null = null

/**
 * 获取数据库绝对路径（存放在 appLocalDataDir/data 目录下）
 */
async function getDbPath(): Promise<string> {
  if (!dbPathPromise) {
    dbPathPromise = (async () => {
      await mkdir(DB_RELATIVE_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true })
      const dataDir = await appLocalDataDir()
      const dbPath = await join(dataDir, DB_RELATIVE_DIR, DB_FILE_NAME)
      return dbPath.replace(/\\/g, '/')
    })()
  }

  return dbPathPromise
}

/**
 * 获取数据库实例（单例模式，同窗并发共用一次 load）
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance
  }
  if (!dbLoadPromise) {
    dbLoadPromise = (async () => {
      const dbPath = await getDbPath()
      dbInstance = await Database.load(`sqlite:${dbPath}`)
      return dbInstance
    })().catch((error) => {
      dbLoadPromise = null
      throw error
    })
  }
  return dbLoadPromise
}

/**
 * 初始化数据库表结构（仅登录成功时调用，各窗口启动不再执行）
 */
export async function initDatabase(): Promise<void> {
  if (schemaReadyPromise) {
    return schemaReadyPromise
  }

  schemaReadyPromise = (async () => {
    const db = await getDb()
    await ensureSchema(db)
  })().catch((error) => {
    schemaReadyPromise = null
    throw error
  })

  return schemaReadyPromise
}

async function ensureSchema(db: Database): Promise<void> {
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

  // 插件安装记录（按 user_id 隔离）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_plugin_installation (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      application_id TEXT,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      author TEXT NOT NULL,
      icon_url TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      installed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      root_path TEXT NOT NULL,
      package_sha256 TEXT NOT NULL DEFAULT '',
      signature_status TEXT NOT NULL DEFAULT 'unverified',
      development_path TEXT,
      manifest_json TEXT NOT NULL,
      grants_json TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (user_id, id)
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_plugin_installation_user_id ON t_plugin_installation(user_id)`)

  // 插件 KV 存储（按 plugin_id + user_id 隔离）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_plugin_kv (
      plugin_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (plugin_id, user_id, key)
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_t_plugin_kv_plugin_user ON t_plugin_kv(plugin_id, user_id)`)

  // 工作助手会话（按 user_id 隔离）
  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_work_conversation (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      runtime_id TEXT NOT NULL,
      provider_id TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      workspace_path TEXT NOT NULL DEFAULT '',
      scope_mode TEXT NOT NULL DEFAULT 'chat',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_work_conversation_user_updated ON t_work_conversation(user_id, updated_at DESC)`
  )

  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_work_message (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      run_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_work_message_user_conversation ON t_work_message(user_id, conversation_id, created_at ASC)`
  )

  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_work_message_attachment (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'other',
      created_at TEXT NOT NULL
    )
  `)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_work_attachment_user_message ON t_work_message_attachment(user_id, message_id, created_at ASC)`
  )

  await db.execute(`
    CREATE TABLE IF NOT EXISTS t_work_step (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      sequence INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT ''
    )
  `)
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_t_work_step_user_run ON t_work_step(user_id, conversation_id, run_id, sequence ASC)`
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
  dbLoadPromise = null
  schemaReadyPromise = null
}

// 导出所有数据库操作
export * from './message'
export * from './spaceUpload'
export * from './spaceDownload'
export * from './spaceRecentAccess'
export * from './plugin'
export * from './workAssistant'
