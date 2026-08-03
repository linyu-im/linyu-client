import { appLocalDataDir, join } from '@tauri-apps/api/path'
import { exists, mkdir, readDir, readFile, writeFile } from '@tauri-apps/plugin-fs'
import { fetchBinary } from '@/utils/network/http'
import { resolveLocalMediaFilePath } from '@/utils/file/blobFilePath'

const MSG_STORAGE_DIR = {
  file: 'msg/file',
  media: 'msg/media'
} as const

const MSG_STICKER_DIR = 'msg/sticker'

export type MessageStorageCategory = keyof typeof MSG_STORAGE_DIR

export type MessageDownloadCategory = MessageStorageCategory | 'sticker'

const splitSaveFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0) return { base: fileName, ext: '' }
  return { base: fileName.slice(0, lastDot), ext: fileName.slice(lastDot) }
}

export const formatYearMonth = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export const resolveMessageStorageRoot = (configuredPath?: string) => {
  const trimmed = configuredPath?.trim() ?? ''
  if (trimmed) return Promise.resolve(trimmed)
  return appLocalDataDir().then((dir) => join(dir, 'linyu', 'data'))
}

export const resolveFileExtension = (fileName?: string, url?: string, defaultExtension = '.jpg'): string => {
  const fromName = fileName?.match(/(\.[^.\\/]+)$/)?.[1]
  if (fromName) {
    return fromName.startsWith('.') ? fromName.toLowerCase() : `.${fromName.toLowerCase()}`
  }

  if (url) {
    try {
      const pathname = new URL(url).pathname
      const match = pathname.match(/(\.[^./]+)$/i)
      if (match) return match[1].toLowerCase()
    } catch {
      const match = url.match(/(\.[^./?#]+)(?:\?|#|$)/i)
      if (match) return match[1].toLowerCase()
    }
  }

  return defaultExtension
}

export const sanitizeStorageId = (id: string) =>
  id
    .replace(/[<>:"/\\|?*]/g, '_')
    .split('')
    .map((ch) => (ch.charCodeAt(0) < 32 ? '_' : ch))
    .join('')
    .trim()

/** 表情缓存优先从 URL 解析后缀（名称常为中文不含后缀） */
export const resolveStickerExtension = (fileName?: string, sourceUrl?: string, defaultExtension = '.png') => {
  if (sourceUrl) {
    const fromUrl = resolveFileExtension(undefined, sourceUrl, '')
    if (fromUrl) return fromUrl
  }
  return resolveFileExtension(fileName, sourceUrl, defaultExtension)
}

const buildStorageDir = (storageRoot: string, category: MessageStorageCategory, date = new Date()) =>
  join(storageRoot, MSG_STORAGE_DIR[category], formatYearMonth(date))

export const buildMessageFileDir = (storageRoot: string, date = new Date()) =>
  buildStorageDir(storageRoot, 'file', date)

export const buildMessageMediaDir = (storageRoot: string, date = new Date()) =>
  buildStorageDir(storageRoot, 'media', date)

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

export const buildMessageMediaPath = async (
  storageRoot: string,
  messageId: string,
  extension: string,
  date = new Date()
) => {
  const dir = await buildMessageMediaDir(storageRoot, date)
  await mkdir(dir, { recursive: true })
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return join(dir, `${messageId}${ext}`)
}

export const buildMessageStickerPath = async (storageRoot: string, stickerId: string, extension: string) => {
  const safeId = sanitizeStorageId(stickerId)
  const dir = await join(storageRoot, MSG_STICKER_DIR)
  await mkdir(dir, { recursive: true })
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return join(dir, `${safeId}${ext}`)
}

export const findExistingStickerPath = async (storageRoot: string, stickerId: string) => {
  const safeId = sanitizeStorageId(stickerId)
  if (!safeId) return null

  const dir = await join(storageRoot, MSG_STICKER_DIR)
  if (!(await exists(dir))) return null

  const entries = await readDir(dir)
  for (const entry of entries) {
    if (!entry.isFile || !entry.name) continue
    if (entry.name === safeId || entry.name.startsWith(`${safeId}.`)) {
      return join(dir, entry.name)
    }
  }
  return null
}

export const resolveStickerCachePath = async (
  storageRoot: string,
  stickerId: string,
  fileName?: string,
  sourceUrl?: string
) => {
  const existing = await findExistingStickerPath(storageRoot, stickerId)
  if (existing) return existing

  const extension = resolveStickerExtension(fileName, sourceUrl, '.png')
  return buildMessageStickerPath(storageRoot, stickerId, extension)
}

const readSourceBuffer = async (sourceUrl: string): Promise<Uint8Array | null> => {
  const sourcePath = resolveLocalMediaFilePath(sourceUrl)
  if (sourcePath) return readFile(sourcePath)

  if (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:')) {
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`read source failed: ${response.status}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }

  return null
}

const writeNamedFile = async (storageRoot: string, fileName: string, buffer: Uint8Array) => {
  const dir = await buildMessageFileDir(storageRoot)
  await mkdir(dir, { recursive: true })
  const filePath = await resolveUniqueMessageFilePath(dir, fileName)
  await writeFile(filePath, buffer)
  return filePath
}

const writeMessageIdFile = async (
  storageRoot: string,
  messageId: string,
  fileName: string,
  sourceUrl: string,
  buffer: Uint8Array
) => {
  const extension = resolveFileExtension(fileName, sourceUrl)
  const filePath = await buildMessageMediaPath(storageRoot, messageId, extension)
  await writeFile(filePath, buffer)
  return filePath
}

/** 自己发送的消息附件：在上传前保存一份到本地 */
export const stageSelfSentToStorage = async (options: {
  storageRoot: string
  sourceUrl: string
  category: MessageStorageCategory
  fileName: string
  messageId?: string
}) => {
  const { storageRoot, sourceUrl, category, fileName, messageId } = options
  const buffer = await readSourceBuffer(sourceUrl)
  if (!buffer) return null

  if (category === 'file') {
    return writeNamedFile(storageRoot, fileName, buffer)
  }

  if (!messageId) return null
  return writeMessageIdFile(storageRoot, messageId, fileName, sourceUrl, buffer)
}

/** 从远端下载并保存到本地消息目录 */
export const downloadMessageToStorage = async (options: {
  storageRoot: string
  sourceUrl: string
  category: MessageDownloadCategory
  fileName: string
  messageId?: string
  stickerId?: string
  onProgress?: (progress: number) => void
  defaultExtension?: string
}) => {
  const { storageRoot, sourceUrl, fileName, messageId, stickerId, onProgress, category, defaultExtension } = options

  if (category === 'sticker' && stickerId) {
    const safeId = sanitizeStorageId(stickerId)
    if (!safeId) throw new Error('invalid sticker id')

    const existing = await findExistingStickerPath(storageRoot, safeId)
    if (existing) return existing

    const extension = resolveStickerExtension(fileName, sourceUrl, defaultExtension ?? '.png')
    const filePath = await buildMessageStickerPath(storageRoot, safeId, extension)

    const buffer = await fetchBinary(sourceUrl, onProgress)
    await writeFile(filePath, new Uint8Array(buffer))
    return filePath
  }

  if (category === 'media' && messageId) {
    const extension = resolveFileExtension(fileName, sourceUrl, defaultExtension ?? '.jpg')
    const filePath = await buildMessageMediaPath(storageRoot, messageId, extension)
    if (await exists(filePath)) return filePath

    const buffer = await fetchBinary(sourceUrl, onProgress)
    await writeFile(filePath, new Uint8Array(buffer))
    return filePath
  }

  const dir = await buildMessageFileDir(storageRoot)
  await mkdir(dir, { recursive: true })
  const filePath = await resolveUniqueMessageFilePath(dir, fileName)
  const buffer = await fetchBinary(sourceUrl, onProgress)
  await writeFile(filePath, new Uint8Array(buffer))
  return filePath
}
