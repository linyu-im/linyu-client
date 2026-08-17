import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { LoginHistoryItem } from '@/stores/user/loginHistory'

const RELATIVE_DIR = 'data'
const RELATIVE_PATH = 'data/login-history.json'
export const LOGIN_HISTORY_STORAGE_KEY = 'loginHistory'

const normalizeAccounts = (raw: unknown): LoginHistoryItem[] => {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter((item): item is LoginHistoryItem => {
      return !!item && typeof item === 'object' && typeof (item as LoginHistoryItem).account === 'string'
    })
  }
  if (typeof raw === 'object' && Array.isArray((raw as { accounts?: unknown }).accounts)) {
    return normalizeAccounts((raw as { accounts: unknown }).accounts)
  }
  return []
}

/** 从 localStorage 同步读取（快） */
export const readLoginHistoryLocal = (): LoginHistoryItem[] => {
  try {
    const raw = localStorage.getItem(LOGIN_HISTORY_STORAGE_KEY)
    if (!raw) return []
    return normalizeAccounts(JSON.parse(raw))
  } catch {
    return []
  }
}

/** 写入 localStorage（同步） */
export const writeLoginHistoryLocal = (accounts: LoginHistoryItem[]) => {
  try {
    localStorage.setItem(LOGIN_HISTORY_STORAGE_KEY, JSON.stringify({ accounts }))
  } catch {
    // ignore
  }
}

/** 从 AppLocalData 文件读取（跨窗口可靠） */
export const readLoginHistoryDisk = () => {
  return exists(RELATIVE_PATH, { baseDir: BaseDirectory.AppLocalData })
    .then((has) => {
      if (!has) return [] as LoginHistoryItem[]
      return readTextFile(RELATIVE_PATH, { baseDir: BaseDirectory.AppLocalData }).then((raw) =>
        normalizeAccounts(JSON.parse(raw))
      )
    })
    .catch(() => [] as LoginHistoryItem[])
}

/** 写入 AppLocalData 文件 */
export const writeLoginHistoryDisk = (accounts: LoginHistoryItem[]) => {
  return mkdir(RELATIVE_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true })
    .then(() =>
      writeTextFile(RELATIVE_PATH, JSON.stringify({ accounts }), {
        baseDir: BaseDirectory.AppLocalData
      })
    )
    .catch((error) => {
      console.error('[loginHistory] write disk failed:', error)
    })
}

/** 合并多源，按 account 去重，后者覆盖前者顺序优先用 disk */
export const mergeLoginHistory = (...sources: LoginHistoryItem[][]): LoginHistoryItem[] => {
  const map = new Map<string, LoginHistoryItem>()
  for (const list of sources) {
    for (const item of list) {
      if (!item?.account) continue
      map.set(item.account, item)
    }
  }
  return Array.from(map.values())
}
