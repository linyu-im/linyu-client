import { convertFileSrc } from '@tauri-apps/api/core'

const blobUrlToFilePath = new Map<string, string>()

export const registerBlobFilePath = (blobUrl: string, filePath: string) => {
  blobUrlToFilePath.set(blobUrl, filePath)
}

export const getBlobFilePath = (blobUrl: string): string | undefined => {
  return blobUrlToFilePath.get(blobUrl)
}

export const unregisterBlobFilePath = (blobUrl: string) => {
  blobUrlToFilePath.delete(blobUrl)
}

/** 将本地媒体 URL 转为可展示的地址（消息列表预览用） */
export const resolveLocalMediaDisplayUrl = (url: string): string => {
  if (!url) return ''
  if (url.startsWith('local-file://')) {
    return convertFileSrc(decodeURIComponent(url.slice('local-file://'.length)))
  }
  const mapped = blobUrlToFilePath.get(url)
  if (mapped) return convertFileSrc(mapped)
  return url
}
