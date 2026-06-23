import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { appDataDir, join } from '@tauri-apps/api/path'
import { mkdir, remove, writeFile } from '@tauri-apps/plugin-fs'
import { useSystemSettingStore } from '@/stores/systemSetting'
import { useUserStore } from '@/stores/user'
import type { UploadFileChunksParam, UploadFileProgressPayload } from '@/types/cmd/upload'
import { getBlobFilePath } from '@/utils/blobFilePath'

const SERVICE_URL: string = import.meta.env.VITE_SERVICE_URL

export type UploadProgressHandler = (progress: number) => void
export type UploadErrorHandler = (message: string) => void

export interface MessageMediaUploadOptions {
  onProgress?: UploadProgressHandler
  onError?: UploadErrorHandler
}

const clampProgress = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

export const isLocalMediaUrl = (url: string) =>
  url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('local-file://')

/** 发送前需上传到服务端的本地媒体 URL（含 Tauri 本地文件映射） */
export const needsMediaUpload = (url: string) => {
  if (!url) return false
  if (getBlobFilePath(url)) return true
  return isLocalMediaUrl(url)
}

const reportUploadError = (options: MessageMediaUploadOptions | undefined, message: string) => {
  options?.onError?.(message)
}

const blobToTempFile = async (blob: Blob, fileName: string): Promise<string> => {
  const dataDir = await appDataDir()
  const tempDir = await join(dataDir, 'linyu', 'uploads')
  await mkdir(tempDir, { recursive: true })

  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  const tempFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const tempPath = await join(tempDir, tempFileName)

  const buffer = await blob.arrayBuffer()
  await writeFile(tempPath, new Uint8Array(buffer))

  return tempPath
}

const invokeUpload = (filePath: string, fileName: string, options?: MessageMediaUploadOptions, tempFile?: boolean) => {
  console.log('[upload] filePath:', filePath, '| tempFile:', tempFile)
  const report = (progress: number) => options?.onProgress?.(clampProgress(progress))
  report(0)

  const userStore = useUserStore()
  const systemSettingStore = useSystemSettingStore()

  const unlistenPromise = listen<UploadFileProgressPayload>('upload-file-progress', (event) => {
    report(event.payload.progress)
  })

  const param: UploadFileChunksParam = {
    filePath,
    fileName,
    baseUrl: SERVICE_URL,
    authToken: userStore.authInfo.token || '',
    lang: systemSettingStore.preferences.lang || 'zh',
    tempFile
  }

  return invoke<string>('upload_file_chunks', { param })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      reportUploadError(options, message)
      return null
    })
    .then((result) => {
      if (result) report(100)
      return result
    })
    .finally(() => {
      unlistenPromise.then((unlisten) => unlisten())
    })
}

export const uploadMessageMediaBlob = (blob: Blob, fileName: string, options?: MessageMediaUploadOptions) => {
  let tempPath: string | null = null

  return blobToTempFile(blob, fileName)
    .then((path) => {
      tempPath = path
      return invokeUpload(path, fileName, options, true)
    })
    .finally(() => {
      if (tempPath) remove(tempPath).catch(() => {})
    })
}

export const uploadMessageMediaByUrl = (url: string, fileName: string, options?: MessageMediaUploadOptions) => {
  const realPath = getBlobFilePath(url)
  console.log('[upload] url:', url, '| realPath:', realPath)
  if (realPath) {
    return invokeUpload(realPath, fileName, options, false)
  }

  if (!url || !isLocalMediaUrl(url)) {
    return Promise.resolve(url || null)
  }

  return fetch(url)
    .then((res) => {
      if (!res.ok) return null
      return res.blob()
    })
    .then((blob) => {
      if (!blob) {
        reportUploadError(options, 'read local file failed')
        return null
      }
      return uploadMessageMediaBlob(blob, fileName, options)
    })
    .catch(() => {
      reportUploadError(options, 'read local file failed')
      return null
    })
}
