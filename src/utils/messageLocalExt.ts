import type {
  FileMessageLocalExt,
  ImageMessageLocalExt,
  StickerMessageLocalExt,
  VideoMessageLocalExt
} from '@/types/api/message'

export const FILE_MESSAGE_STATUS_DOWNLOADED = 'downloaded'

type MediaMessageLocalExt = ImageMessageLocalExt | VideoMessageLocalExt | StickerMessageLocalExt

const parseMediaMessageLocalExt = (parsed: Record<string, unknown>): MediaMessageLocalExt | undefined => {
  const localPath = typeof parsed.localPath === 'string' && parsed.localPath ? parsed.localPath : undefined
  const displayWidth =
    typeof parsed.displayWidth === 'number' && parsed.displayWidth > 0 ? parsed.displayWidth : undefined
  const displayHeight =
    typeof parsed.displayHeight === 'number' && parsed.displayHeight > 0 ? parsed.displayHeight : undefined

  if (!localPath && (!displayWidth || !displayHeight)) return undefined

  return {
    ...(localPath ? { localPath } : {}),
    ...(displayWidth && displayHeight ? { displayWidth, displayHeight } : {})
  }
}

export function mergeMediaMessageLocalExt<T extends MediaMessageLocalExt>(
  existing: T | undefined,
  patch: Partial<T>
): T {
  return {
    localPath: patch.localPath ?? existing?.localPath,
    displayWidth: patch.displayWidth ?? existing?.displayWidth,
    displayHeight: patch.displayHeight ?? existing?.displayHeight
  } as T
}

export const serializeMessageLocalExt = (msgType: string, localExt: unknown): string | undefined => {
  if (localExt == null) return undefined
  if (msgType === 'file' || msgType === 'image' || msgType === 'video' || msgType === 'sticker') {
    const payload = localExt as MediaMessageLocalExt | FileMessageLocalExt
    if (msgType !== 'file') {
      const media = payload as MediaMessageLocalExt
      if (!media.localPath && !media.displayWidth) return undefined
    }
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
      return parseMediaMessageLocalExt(parsed)
    }
  } catch {
    return undefined
  }
  return undefined
}
