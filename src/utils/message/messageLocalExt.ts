import type {
  FileMessageLocalExt,
  ImageMessageLocalExt,
  StickerMessageLocalExt,
  VideoMessageLocalExt
} from '@/types/api/message'

export const FILE_MESSAGE_STATUS_DOWNLOADED = 'downloaded'
export const FILE_MESSAGE_STATUS_EXPIRED = 'expired'

type MediaMessageLocalExt = ImageMessageLocalExt | VideoMessageLocalExt | StickerMessageLocalExt

const parseMediaMessageLocalExt = (parsed: Record<string, unknown>): MediaMessageLocalExt | undefined => {
  const localPath = typeof parsed.localPath === 'string' && parsed.localPath ? parsed.localPath : undefined
  const displayWidth =
    typeof parsed.displayWidth === 'number' && parsed.displayWidth > 0 ? parsed.displayWidth : undefined
  const displayHeight =
    typeof parsed.displayHeight === 'number' && parsed.displayHeight > 0 ? parsed.displayHeight : undefined

  const contentX = typeof parsed.contentX === 'number' && parsed.contentX >= 0 ? parsed.contentX : undefined
  const contentY = typeof parsed.contentY === 'number' && parsed.contentY >= 0 ? parsed.contentY : undefined
  const contentWidth =
    typeof parsed.contentWidth === 'number' && parsed.contentWidth > 0 ? parsed.contentWidth : undefined
  const contentHeight =
    typeof parsed.contentHeight === 'number' && parsed.contentHeight > 0 ? parsed.contentHeight : undefined
  const sourceWidth = typeof parsed.sourceWidth === 'number' && parsed.sourceWidth > 0 ? parsed.sourceWidth : undefined
  const sourceHeight =
    typeof parsed.sourceHeight === 'number' && parsed.sourceHeight > 0 ? parsed.sourceHeight : undefined
  const hasContentBox = contentX != null && contentY != null && contentWidth != null && contentHeight != null

  if (!localPath && !hasContentBox && (!displayWidth || !displayHeight)) return undefined

  return {
    ...(localPath ? { localPath } : {}),
    ...(displayWidth && displayHeight ? { displayWidth, displayHeight } : {}),
    ...(hasContentBox ? { contentX, contentY, contentWidth, contentHeight } : {}),
    ...(sourceWidth && sourceHeight ? { sourceWidth, sourceHeight } : {})
  }
}

export function mergeMediaMessageLocalExt<T extends MediaMessageLocalExt>(
  existing: T | undefined,
  patch: Partial<T>
): T {
  const merged: Record<string, unknown> = {
    localPath: patch.localPath ?? existing?.localPath,
    displayWidth: patch.displayWidth ?? existing?.displayWidth,
    displayHeight: patch.displayHeight ?? existing?.displayHeight
  }

  const stickerPatch = patch as Partial<StickerMessageLocalExt>
  const stickerExisting = existing as StickerMessageLocalExt | undefined
  const contentX = stickerPatch.contentX ?? stickerExisting?.contentX
  const contentY = stickerPatch.contentY ?? stickerExisting?.contentY
  const contentWidth = stickerPatch.contentWidth ?? stickerExisting?.contentWidth
  const contentHeight = stickerPatch.contentHeight ?? stickerExisting?.contentHeight
  const sourceWidth = stickerPatch.sourceWidth ?? stickerExisting?.sourceWidth
  const sourceHeight = stickerPatch.sourceHeight ?? stickerExisting?.sourceHeight
  if (contentX != null && contentY != null && contentWidth != null && contentHeight != null) {
    merged.contentX = contentX
    merged.contentY = contentY
    merged.contentWidth = contentWidth
    merged.contentHeight = contentHeight
  }
  if (sourceWidth != null && sourceHeight != null) {
    merged.sourceWidth = sourceWidth
    merged.sourceHeight = sourceHeight
  }

  return merged as T
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
