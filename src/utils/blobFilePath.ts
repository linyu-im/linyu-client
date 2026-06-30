import { convertFileSrc } from '@tauri-apps/api/core'
import { readFile } from '@tauri-apps/plugin-fs'

const blobUrlToFilePath = new Map<string, string>()

const mediaMimeByExt: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
  mkv: 'video/x-matroska'
}

export const registerBlobFilePath = (blobUrl: string, filePath: string) => {
  blobUrlToFilePath.set(blobUrl, filePath)
}

export const getBlobFilePath = (blobUrl: string): string | undefined => {
  return blobUrlToFilePath.get(blobUrl)
}

/** 从本地媒体 URL 解析磁盘路径（blob / local-file） */
export const resolveLocalMediaFilePath = (url: string): string | null => {
  if (!url) return null
  if (url.startsWith('local-file://')) {
    return decodeURIComponent(url.slice('local-file://'.length))
  }
  const mapped = getBlobFilePath(url)
  return mapped ?? null
}

export const unregisterBlobFilePath = (blobUrl: string) => {
  blobUrlToFilePath.delete(blobUrl)
}

/** 本地绝对路径 → asset 协议 URL（需在 tauri.conf assetProtocol.scope 中放行） */
export const toLocalFileDisplayUrl = (absolutePath: string) => convertFileSrc(absolutePath)

/** asset 协议不可用时的兜底（如自定义存储目录未加入 scope） */
export const readLocalFileAsObjectUrl = async (absolutePath: string): Promise<string> => {
  const buffer = await readFile(absolutePath)
  const ext = absolutePath.split('.').pop()?.toLowerCase() ?? 'jpg'
  const blob = new Blob([buffer], { type: mediaMimeByExt[ext] ?? 'application/octet-stream' })
  return URL.createObjectURL(blob)
}

/** 将本地媒体 URL 转为可展示的地址（消息列表预览用） */
export const resolveLocalMediaDisplayUrl = (url: string): string => {
  if (!url) return ''
  if (url.startsWith('local-file://')) {
    return toLocalFileDisplayUrl(decodeURIComponent(url.slice('local-file://'.length)))
  }
  const mapped = blobUrlToFilePath.get(url)
  if (mapped) return toLocalFileDisplayUrl(mapped)
  return url
}
