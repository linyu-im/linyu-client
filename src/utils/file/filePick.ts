import { open } from '@tauri-apps/plugin-dialog'
import { stat } from '@tauri-apps/plugin-fs'

export const FILE_PATH_KEY = '__filePath'
const FILE_SIZE_KEY = '__fileSize'

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg'
}

const getFileNameFromPath = (path: string) => path.replace(/^.*[/\\]/, '')

const guessMimeFromName = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

/** 网盘上传专用：规范化可能来自 SQLite/IPC 的 size */
export const normalizeFileSize = (value: unknown): number => {
  if (typeof value === 'bigint') {
    const asNumber = Number(value)
    return Number.isSafeInteger(asNumber) && asNumber >= 0 ? asNumber : 0
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return Math.trunc(parsed)
  }
  return 0
}

export const readPathAsFile = async (path: string) => {
  const fileStat = await stat(path)
  const name = getFileNameFromPath(path)
  const type = guessMimeFromName(name)
  const file = new File([], name, { type })
  Object.defineProperty(file, FILE_PATH_KEY, { value: path, enumerable: false })
  Object.defineProperty(file, FILE_SIZE_KEY, {
    value: typeof fileStat.size === 'number' ? fileStat.size : normalizeFileSize(fileStat.size),
    enumerable: false
  })
  return file
}

export const getFilePath = (file: File): string | undefined => {
  const custom = (file as any)[FILE_PATH_KEY]
  if (typeof custom === 'string' && custom) return custom
  // Tauri / WebView 拖入的 File 通常带有本地 path
  const tauriPath = (file as any).path
  if (typeof tauriPath === 'string' && tauriPath) return tauriPath
  return undefined
}

/** 保持原语义：优先自定义元数据，否则用 File.size（消息编辑器依赖此行为） */
export const getFileSize = (file: File): number => {
  const metadataSize = (file as any)[FILE_SIZE_KEY]
  if (typeof metadataSize === 'number' && Number.isFinite(metadataSize) && metadataSize >= 0) {
    return metadataSize
  }
  return file.size
}

/** 网盘上传：从磁盘读取真实大小 */
export const statFileSize = (filePath: string) => stat(filePath).then((info) => normalizeFileSize(info.size))

interface PickFilesOptions {
  title: string
  multiple?: boolean
  filters?: { name: string; extensions: string[] }[]
}

export const pickFiles = async (options: PickFilesOptions) => {
  const selected = await open({
    multiple: options.multiple ?? true,
    title: options.title,
    filters: options.filters
  })
  if (!selected) return []

  const paths = Array.isArray(selected) ? selected : [selected]
  const files: File[] = []
  for (const path of paths) {
    files.push(await readPathAsFile(path))
  }
  return files
}

export const IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
