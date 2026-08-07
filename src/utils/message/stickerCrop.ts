import { readFile } from '@tauri-apps/plugin-fs'

/**
 * 贴纸非透明内容盒：源图像素坐标系下的图案包围盒。
 * 贴纸资产常为正方形画布、图案四周带透明留白且左右不对称，
 * 直接显示完整画布会留下明显的单边空隙。
 */
export interface StickerContentBox {
  x: number
  y: number
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
}

/** 透明度低于该值的像素视为空白 */
const ALPHA_THRESHOLD = 8
/** 内容离画布边缘的留白小于该值时视为已铺满，无需裁剪 */
const MIN_MARGIN_PX = 2
/** 超过该像素数时扫描间隔加大，避免大图全量扫描卡顿 */
const LARGE_IMAGE_PIXELS = 512 * 512

const mimeByExt: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp'
}

/** 裁剪结果 URL 共享缓存：同一文件 + 同一内容盒只裁一次 */
const croppedUrlCache = new Map<string, string>()
/** 远程未缓存场景（基于已加载 img 元素）的裁剪结果缓存 */
const remoteCroppedUrlCache = new Map<string, string>()

const getFileExtension = (fileName: string) => {
  const match = fileName.match(/\.([^./\\]+)$/)
  return match ? match[1].toLowerCase() : ''
}

const createBlobFromBytes = (bytes: Uint8Array, fileName = 'sticker.png') =>
  new Blob([bytes as BlobPart], { type: mimeByExt[getFileExtension(fileName)] ?? 'image/png' })

export const isAnimatedMediaName = (name?: string) => {
  const lower = (name ?? '').toLowerCase()
  return /\.gif($|[?#])/.test(lower)
}

/** PNG 是否包含 acTL 动画块（APNG），裁剪会丢失动画，需跳过 */
const pngHasAnimationChunk = (bytes: Uint8Array): boolean => {
  if (bytes.length < 8) return false
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  if (!isPng) return false

  let offset = 8
  while (offset + 8 <= bytes.length) {
    const length =
      ((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)
    const type = String.fromCharCode(
      bytes[offset + 4] ?? 0,
      bytes[offset + 5] ?? 0,
      bytes[offset + 6] ?? 0,
      bytes[offset + 7] ?? 0
    )
    if (type === 'acTL') return true
    if (type === 'IEND' || length <= 0) return false
    offset += 12 + length
  }
  return false
}

/** 动画（gif/apng）以及非 PNG 格式不参与裁剪 */
const shouldSkipCropForFile = (fileName: string, bytes: Uint8Array): boolean => {
  if (isAnimatedMediaName(fileName)) return true
  const ext = getFileExtension(fileName)
  if (ext !== 'png') return true
  return pngHasAnimationChunk(bytes)
}

const loadImageFromBlob = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode image failed'))
    }
    image.src = url
  })

/** 扫描 alpha 通道得到非透明内容盒；canvas 被污染或解码失败时返回 null */
const measureContentBox = (image: HTMLImageElement): StickerContentBox | null => {
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  try {
    ctx.drawImage(image, 0, 0)
    const data = ctx.getImageData(0, 0, width, height).data

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    const stride = width * height > LARGE_IMAGE_PIXELS ? 2 : 1
    for (let y = 0; y < height; y += stride) {
      const rowOffset = y * width * 4
      for (let x = 0; x < width; x += stride) {
        if (data[rowOffset + x * 4 + 3] > ALPHA_THRESHOLD) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX < minX || maxY < minY) return null
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      sourceWidth: width,
      sourceHeight: height
    }
  } catch {
    return null
  }
}

const isMarginNegligible = (box: StickerContentBox): boolean => {
  const left = box.x
  const top = box.y
  const right = box.sourceWidth - (box.x + box.width)
  const bottom = box.sourceHeight - (box.y + box.height)
  return left <= MIN_MARGIN_PX && top <= MIN_MARGIN_PX && right <= MIN_MARGIN_PX && bottom <= MIN_MARGIN_PX
}

const createCroppedUrl = async (image: HTMLImageElement, box: StickerContentBox): Promise<string> => {
  const canvas = document.createElement('canvas')
  canvas.width = box.width
  canvas.height = box.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas context unavailable')
  ctx.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('toBlob failed'))), 'image/png')
  })
  return URL.createObjectURL(blob)
}

const buildCroppedStickerCacheKey = (localPath: string, box: StickerContentBox) =>
  `${localPath}|${box.x},${box.y},${box.width}x${box.height}`

/**
 * 本地文件裁剪入口：读取文件 → 测量（可用缓存的 bbox 跳过测量）→ 裁出内容图。
 * 返回 null 表示无需裁剪（动画 / 非 PNG / 内容铺满 / 读取解码失败）。
 */
export const cropStickerFile = async (
  localPath: string,
  knownBox?: StickerContentBox
): Promise<{ url: string; box: StickerContentBox } | null> => {
  let bytes: Uint8Array
  try {
    bytes = await readFile(localPath)
  } catch {
    return null
  }
  if (shouldSkipCropForFile(localPath, bytes)) return null

  const image = await loadImageFromBlob(createBlobFromBytes(bytes, localPath))

  const box: StickerContentBox | null = knownBox
    ? {
        x: knownBox.x,
        y: knownBox.y,
        width: knownBox.width,
        height: knownBox.height,
        sourceWidth: image.naturalWidth,
        sourceHeight: image.naturalHeight
      }
    : measureContentBox(image)
  if (!box || box.width <= 0 || box.height <= 0) return null
  if (isMarginNegligible(box)) return null

  const cacheKey = buildCroppedStickerCacheKey(localPath, box)
  const cached = croppedUrlCache.get(cacheKey)
  if (cached) return { url: cached, box }

  const url = await createCroppedUrl(image, box)
  croppedUrlCache.set(cacheKey, url)
  return { url, box }
}

/**
 * 直接用已加载的 img 元素测量并裁剪（用于远程未缓存、本地读取不可用的场景）。
 * canvas 被污染（远程未带 CORS）时返回 null。
 */
export const cropStickerImage = async (
  image: HTMLImageElement
): Promise<{ url: string; box: StickerContentBox } | null> => {
  const box = measureContentBox(image)
  if (!box || box.width <= 0 || box.height <= 0) return null
  if (isMarginNegligible(box)) return null

  const src = image.currentSrc || image.src
  const cacheKey = `${src}|${box.x},${box.y},${box.width}x${box.height}`
  const cached = remoteCroppedUrlCache.get(cacheKey)
  if (cached) return { url: cached, box }

  try {
    const url = await createCroppedUrl(image, box)
    remoteCroppedUrlCache.set(cacheKey, url)
    return { url, box }
  } catch {
    return null
  }
}
