import type { ImageMessageLocalExt, StickerMessageLocalExt, VideoMessageLocalExt } from '@/types/api/message'

export const MEDIA_COVER_HEIGHT = 160
export const MEDIA_COVER_MAX_WIDTH = 320
export const DEFAULT_MEDIA_COVER_WIDTH = Math.min(MEDIA_COVER_MAX_WIDTH, Math.round((MEDIA_COVER_HEIGHT * 16) / 9))

export const DEFAULT_MEDIA_COVER_SIZE = {
  displayWidth: DEFAULT_MEDIA_COVER_WIDTH,
  displayHeight: MEDIA_COVER_HEIGHT
}

export const DEFAULT_STICKER_SIZE = {
  displayWidth: 120,
  displayHeight: 120
}

type MediaLocalExt = ImageMessageLocalExt | VideoMessageLocalExt | StickerMessageLocalExt

export function calcMediaCoverDisplaySize(naturalW: number, naturalH: number) {
  if (naturalW > 0 && naturalH > 0) {
    return {
      displayWidth: Math.min(MEDIA_COVER_MAX_WIDTH, Math.round((naturalW / naturalH) * MEDIA_COVER_HEIGHT)),
      displayHeight: MEDIA_COVER_HEIGHT
    }
  }
  return { ...DEFAULT_MEDIA_COVER_SIZE }
}

export function calcStickerDisplaySize(naturalW: number, naturalH: number) {
  if (naturalW > 0 && naturalH > 0) {
    return {
      displayWidth: naturalW,
      displayHeight: naturalH
    }
  }
  return { ...DEFAULT_STICKER_SIZE }
}

export function getMediaDisplaySizeFromLocalExt(localExt?: MediaLocalExt) {
  const displayWidth = localExt?.displayWidth
  const displayHeight = localExt?.displayHeight
  if (displayWidth && displayWidth > 0 && displayHeight && displayHeight > 0) {
    return { displayWidth, displayHeight }
  }
  return undefined
}

export function hasSameDisplaySize(
  localExt: MediaLocalExt | undefined,
  size: { displayWidth: number; displayHeight: number }
) {
  return localExt?.displayWidth === size.displayWidth && localExt?.displayHeight === size.displayHeight
}
