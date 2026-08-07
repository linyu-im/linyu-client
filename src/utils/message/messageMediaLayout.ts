import type { ImageMessageLocalExt, StickerMessageLocalExt, VideoMessageLocalExt } from '@/types/api/message'

export const MEDIA_COVER_HEIGHT = 160
export const MEDIA_COVER_MAX_WIDTH = 320
export const DEFAULT_MEDIA_COVER_WIDTH = Math.min(MEDIA_COVER_MAX_WIDTH, Math.round((MEDIA_COVER_HEIGHT * 16) / 9))

export const DEFAULT_MEDIA_COVER_SIZE = {
  displayWidth: DEFAULT_MEDIA_COVER_WIDTH,
  displayHeight: MEDIA_COVER_HEIGHT
}

/** 贴纸最长边上限；未知尺寸时用 DEFAULT 占位防闪烁 */
export const STICKER_MAX_SIZE = 144

export const DEFAULT_STICKER_SIZE = {
  displayWidth: STICKER_MAX_SIZE,
  displayHeight: STICKER_MAX_SIZE
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

/** 按贴纸原始比例缩放：高度优先，最长边不超过 STICKER_MAX_SIZE；无效尺寸回退占位 */
export function calcStickerDisplaySize(naturalW?: number, naturalH?: number) {
  if (naturalW && naturalW > 0 && naturalH && naturalH > 0) {
    const scale = Math.min(1, STICKER_MAX_SIZE / naturalW, STICKER_MAX_SIZE / naturalH)
    return {
      displayWidth: Math.max(1, Math.round(naturalW * scale)),
      displayHeight: Math.max(1, Math.round(naturalH * scale))
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
