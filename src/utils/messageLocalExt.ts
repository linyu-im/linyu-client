import type {
  FileMessageLocalExt,
  ImageMessageLocalExt,
  StickerMessageLocalExt,
  VideoMessageLocalExt
} from '@/types/api/message'

export const FILE_MESSAGE_STATUS_DOWNLOADED = 'downloaded'

export const serializeMessageLocalExt = (msgType: string, localExt: unknown): string | undefined => {
  if (localExt == null) return undefined
  if (msgType === 'file' || msgType === 'image' || msgType === 'video' || msgType === 'sticker') {
    return JSON.stringify(localExt)
  }
  return undefined
}

export const parseMessageLocalExt = (
  msgType: string,
  raw?: string
): FileMessageLocalExt | ImageMessageLocalExt | VideoMessageLocalExt | StickerMessageLocalExt | undefined => {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (msgType === 'file') {
      if (typeof parsed.status !== 'string') return undefined
      return {
        status: parsed.status,
        localPath: typeof parsed.localPath === 'string' ? parsed.localPath : ''
      }
    }
    if (msgType === 'image' || msgType === 'video' || msgType === 'sticker') {
      if (typeof parsed.localPath !== 'string' || !parsed.localPath) return undefined
      return { localPath: parsed.localPath }
    }
  } catch {
    return undefined
  }
  return undefined
}
