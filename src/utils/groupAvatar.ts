import { groupApi } from '@/api'
import { useAvatarStore } from '@/stores/user/avatar'

const OUTPUT_SIZE = 200
const PADDING = 6
const GAP = 6
const GAP_COLOR = '#ffffff'
const AVATAR_RADIUS = 10
const FALLBACK_AVATAR = '/avatar.png'

let fallbackAvatarBytes: Uint8Array | null = null

interface AvatarRect {
  x: number
  y: number
  size: number
}

const getCellSize = (count: number) => {
  if (count === 1) return OUTPUT_SIZE - PADDING * 2
  if (count <= 4) return (OUTPUT_SIZE - PADDING * 2 - GAP) / 2
  return (OUTPUT_SIZE - PADDING * 2 - GAP * 2) / 3
}

const getAvatarRect = (count: number, index: number): AvatarRect => {
  const cellSize = getCellSize(count)
  const moveSize = cellSize + GAP
  let x = PADDING
  let y = PADDING

  switch (count) {
    case 1:
      break
    case 2:
      x = PADDING + moveSize * index
      y = (OUTPUT_SIZE - cellSize) / 2
      break
    case 3:
      if (index === 0) {
        x = (OUTPUT_SIZE - cellSize) / 2
      } else {
        x = PADDING + moveSize * (index % 2)
      }
      y = PADDING + moveSize * Math.floor((index + 1) / 2)
      break
    case 4:
      x = PADDING + moveSize * (index % 2)
      y = PADDING + moveSize * Math.floor(index / 2)
      break
    case 5:
      if (index <= 1) {
        x = (OUTPUT_SIZE - cellSize * 2 - PADDING * 2) / 2 + moveSize * (index % 2)
      } else {
        x = PADDING + moveSize * (index % 3)
      }
      y = PADDING + (OUTPUT_SIZE - cellSize * 2) / 2 + moveSize * Math.floor((index + 1) / 3)
      break
    case 6:
      x = PADDING + moveSize * (index % 3)
      y = PADDING + (OUTPUT_SIZE - cellSize * 2) / 2 + moveSize * Math.floor(index / 3)
      break
    case 7:
      if (index === 0) {
        x = (OUTPUT_SIZE - cellSize - PADDING * 2) / 2
      } else {
        x = PADDING + moveSize * ((index - 1) % 3)
      }
      y = PADDING + moveSize * Math.floor((index + 2) / 3)
      break
    case 8:
      if (index <= 1) {
        x = (OUTPUT_SIZE - cellSize * 2 - PADDING * 2) / 2 + moveSize * (index % 3)
      } else {
        x = PADDING + moveSize * ((index - 2) % 3)
      }
      y = PADDING + moveSize * Math.floor((index + 1) / 3)
      break
    default:
      x = PADDING + moveSize * (index % 3)
      y = PADDING + moveSize * Math.floor(index / 3)
      break
  }

  return { x, y, size: cellSize }
}

const sniffMimeType = (bytes: Uint8Array) => {
  if (bytes.length >= 2 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'image/webp'
  }
  return 'image/jpeg'
}

const loadFallbackAvatarBytes = async () => {
  if (fallbackAvatarBytes) return fallbackAvatarBytes
  const response = await fetch(FALLBACK_AVATAR)
  fallbackAvatarBytes = new Uint8Array(await response.arrayBuffer())
  return fallbackAvatarBytes
}

const loadImageFromBytes = async (bytes: Uint8Array): Promise<CanvasImageSource> => {
  const normalized = Uint8Array.from(bytes)
  const blob = new Blob([normalized], { type: sniffMimeType(normalized) })

  if ('createImageBitmap' in window) {
    return createImageBitmap(blob)
  }

  const objectUrl = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('avatar load failed'))
    }
    img.src = objectUrl
  })
}

const getImageSize = (image: CanvasImageSource) => {
  if (image instanceof ImageBitmap) {
    return { width: image.width, height: image.height }
  }
  const img = image as HTMLImageElement
  return { width: img.naturalWidth, height: img.naturalHeight }
}

const clipRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.clip()
}

const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const { width: imageWidth, height: imageHeight } = getImageSize(image)
  if (!imageWidth || !imageHeight) return

  const scale = Math.max(width / imageWidth, height / imageHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (imageWidth - sourceWidth) / 2
  const sourceY = (imageHeight - sourceHeight) / 2

  ctx.save()
  clipRoundRect(ctx, x, y, width, height, AVATAR_RADIUS)
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
  ctx.restore()
}

const canvasToJpegBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result)
          return
        }
        reject(new Error('blob export failed'))
      },
      'image/jpeg',
      0.92
    )
  })

const resolveUserAvatarBytes = async (userId: string) => {
  const avatarStore = useAvatarStore()
  const bytes = await avatarStore.resolveAvatarBytes('user', userId)
  return bytes ?? loadFallbackAvatarBytes()
}

const loadUserAvatarImage = async (userId: string): Promise<CanvasImageSource> => {
  try {
    const bytes = await resolveUserAvatarBytes(userId)
    return await loadImageFromBytes(bytes)
  } catch {
    const fallback = await loadFallbackAvatarBytes()
    return loadImageFromBytes(fallback)
  }
}

export const composeGroupAvatar = async (userIds: string[]): Promise<Blob | null> => {
  const ids = [...new Set(userIds.filter(Boolean))].slice(0, 9)
  if (ids.length < 2) return null

  const count = ids.length
  const images = await Promise.all(ids.map((userId) => loadUserAvatarImage(userId)))

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = GAP_COLOR
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  images.forEach((image, index) => {
    const rect = getAvatarRect(count, index)
    drawImageCover(ctx, image, rect.x, rect.y, rect.size, rect.size)
  })

  return canvasToJpegBlob(canvas)
}

export const syncGroupAvatarAfterCreate = (groupId: string) => {
  if (!groupId) return

  groupApi
    .listMembers({ groupId })
    .then((res) => {
      if (res.code !== 0 || !res.data?.length) return

      const userIds = res.data
        .slice(0, 9)
        .map((member) => member.userId)
        .filter(Boolean)
      if (userIds.length < 2) return

      const avatarStore = useAvatarStore()
      avatarStore.prefetchMany(userIds, 'user')

      return composeGroupAvatar(userIds).then((blob) => {
        if (!blob) return

        return groupApi.uploadAvatar(blob, groupId, 'group-avatar.jpg').then((uploadRes) => {
          if (uploadRes.code === 0 && uploadRes.data) {
            void avatarStore.updateAvatarFromRemote('group', groupId, uploadRes.data)
          }
        })
      })
    })
    .catch(() => {})
}
