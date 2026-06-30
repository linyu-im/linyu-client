import { appDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs'
import { fetchBinary } from '@/utils/http'
import { resolveLocalMediaFilePath } from '@/utils/blobFilePath'

const MSG_FILE_DIR = 'msg/file'

const splitSaveFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) return { base: fileName, ext: '' }
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot) }
}

const formatYearMonth = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export const resolveMessageStorageRoot = (configuredPath?: string) => {
  const trimmed = configuredPath?.trim() ?? ''
  if (trimmed) return Promise.resolve(trimmed)
  return appDataDir().then((dir) => join(dir, 'linyu', 'data'))
}

export const buildMessageFileDir = (storageRoot: string, date = new Date()) =>
  join(storageRoot, MSG_FILE_DIR, formatYearMonth(date))

export const resolveUniqueMessageFilePath = async (dir: string, fileName: string) => {
  const { base, ext } = splitSaveFileName(fileName)
  let candidate = await join(dir, fileName)
  if (!(await exists(candidate))) return candidate

  let index = 1
  while (index < 10000) {
    const nextName = `${base} (${index})${ext}`
    candidate = await join(dir, nextName)
    if (!(await exists(candidate))) return candidate
    index += 1
  }

  throw new Error('failed to resolve unique file path')
}

export const downloadMessageFileToStorage = async (options: {
  storageRoot: string
  fileUrl: string
  fileName: string
  onProgress?: (progress: number) => void
}) => {
  const { storageRoot, fileUrl, fileName, onProgress } = options

  let dir = ''
  let filePath = ''
  dir = await buildMessageFileDir(storageRoot)
  await mkdir(dir, { recursive: true })
  filePath = await resolveUniqueMessageFilePath(dir, fileName)

  let buffer: ArrayBuffer
  buffer = await fetchBinary(fileUrl, onProgress)
  await writeFile(filePath, new Uint8Array(buffer))
  return filePath
}

/** 将本地已存在的文件复制到消息存储目录 */
export const copyMessageFileToStorage = async (options: {
  storageRoot: string
  sourcePath: string
  fileName: string
}) => {
  const { storageRoot, sourcePath, fileName } = options
  const dir = await buildMessageFileDir(storageRoot)
  await mkdir(dir, { recursive: true })
  const filePath = await resolveUniqueMessageFilePath(dir, fileName)
  const buffer = await readFile(sourcePath)
  await writeFile(filePath, buffer)
  return filePath
}

const writeMessageFileBufferToStorage = async (options: {
  storageRoot: string
  fileName: string
  buffer: Uint8Array
}) => {
  const { storageRoot, fileName, buffer } = options
  const dir = await buildMessageFileDir(storageRoot)
  await mkdir(dir, { recursive: true })
  const filePath = await resolveUniqueMessageFilePath(dir, fileName)
  await writeFile(filePath, buffer)
  return filePath
}

/** 自己发送的文件：在上传前保存一份到本地消息目录 */
export const stageSelfSentFileToStorage = async (options: {
  storageRoot: string
  fileUrl: string
  fileName: string
}) => {
  const { storageRoot, fileUrl, fileName } = options
  const sourcePath = resolveLocalMediaFilePath(fileUrl)

  if (sourcePath) {
    return copyMessageFileToStorage({ storageRoot, sourcePath, fileName })
  }

  if (fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`read blob file failed: ${response.status}`)
    }
    const buffer = new Uint8Array(await response.arrayBuffer())
    return writeMessageFileBufferToStorage({ storageRoot, fileName, buffer })
  }

  return null
}
