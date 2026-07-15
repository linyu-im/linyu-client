import { invoke } from '@tauri-apps/api/core'
import { writeImage, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { exists, readFile } from '@tauri-apps/plugin-fs'
import { useAppSettingsStore } from '@/stores/app/appSettings'
import type { Message } from '@/types/api/message'
import { downloadMessageToStorage, resolveMessageStorageRoot } from '@/utils/messageFileSave'

const isImageFileName = (fileName: string) => /\.(png|jpe?g|gif|webp|bmp|ico|avif)$/i.test(fileName)

const getLocalPath = (message: Message) => {
  if (message.msgType === 'image' || message.msgType === 'video' || message.msgType === 'file') {
    return message.localExt?.localPath?.trim() || ''
  }
  return ''
}

const ensureMediaLocalPath = (message: Message): Promise<string> => {
  const existing = getLocalPath(message)
  if (existing) {
    return exists(existing).then((ok) => {
      if (ok) return existing
      return downloadMediaLocalPath(message)
    })
  }
  return downloadMediaLocalPath(message)
}

const downloadMediaLocalPath = (message: Message): Promise<string> => {
  const appSettingsStore = useAppSettingsStore()

  return resolveMessageStorageRoot(appSettingsStore.storage.path).then((storageRoot) => {
    if (message.msgType === 'image') {
      return downloadMessageToStorage({
        storageRoot,
        sourceUrl: message.content.imgUrl,
        category: 'media',
        fileName: message.content.imgName,
        messageId: message.id
      })
    }
    if (message.msgType === 'video') {
      return downloadMessageToStorage({
        storageRoot,
        sourceUrl: message.content.videoUrl,
        category: 'media',
        fileName: message.content.videoName,
        messageId: message.id,
        defaultExtension: '.mp4'
      })
    }
    if (message.msgType === 'file') {
      return downloadMessageToStorage({
        storageRoot,
        sourceUrl: message.content.fileUrl,
        category: 'file',
        fileName: message.content.fileName
      })
    }
    return Promise.reject(new Error('unsupported message type'))
  })
}

const writeClipboardFiles = (paths: string[]) => invoke<void>('write_clipboard_files', { paths })

/**
 * 将消息内容写入系统剪贴板：
 * - 文本：writeText
 * - 图片：writeImage（clipboard-manager）
 * - 文件 / 视频：写入系统文件列表（Windows / macOS / Linux，可粘贴到资源管理器等）
 */
export const copyMessageToClipboard = (message: Message): Promise<void> => {
  switch (message.msgType) {
    case 'text': {
      const text = message.content.text?.trim()
      if (!text) return Promise.reject(new Error('empty text'))
      return writeText(text)
    }
    case 'image':
      return ensureMediaLocalPath(message).then((localPath) => readFile(localPath).then((bytes) => writeImage(bytes)))
    case 'video':
      return ensureMediaLocalPath(message).then((localPath) => writeClipboardFiles([localPath]))
    case 'file':
      return ensureMediaLocalPath(message).then((localPath) => {
        // 图片类文件也按位图写入，便于粘贴到画图/文档
        if (isImageFileName(message.content.fileName)) {
          return readFile(localPath).then((bytes) => writeImage(bytes))
        }
        return writeClipboardFiles([localPath])
      })
    case 'ecard': {
      const name = message.content.userName?.trim()
      if (!name) return Promise.reject(new Error('empty ecard'))
      return writeText(name)
    }
    default:
      return Promise.reject(new Error('unsupported message type'))
  }
}
