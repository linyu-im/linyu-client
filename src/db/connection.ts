import Database from '@tauri-apps/plugin-sql'
import { appLocalDataDir, BaseDirectory, join } from '@tauri-apps/api/path'
import { mkdir } from '@tauri-apps/plugin-fs'

const DB_RELATIVE_DIR = 'data'
const DB_FILE_NAME = 'linyu.db'

let dbInstance: Database | null = null
let dbPathPromise: Promise<string> | null = null
let dbLoadPromise: Promise<Database> | null = null

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
 * 获取数据库实例
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

export async function closeDbConnection(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
  dbLoadPromise = null
}

export type { Database }
