import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { spaceUploadApi } from '@/api'
import { SPACE_UPLOAD_FILE_PROGRESS_EVENT as SPACE_PROGRESS_EVENT } from '@/constants/event'
import { SERVICE_URL } from '@/constants/network'
import { useSystemSettingStore } from '@/stores/app/systemSetting'
import { useUserStore } from '@/stores/user/user'
import type { SpaceUploadFileParam, UploadFileProgressPayload } from '@/types/cmd/upload'
import { DEFAULT_FILE_CHUNK_SIZE } from '@/utils/file/fileChunk'
import { appLocalDataDir, join } from '@tauri-apps/api/path'
import { mkdir, open, writeFile } from '@tauri-apps/plugin-fs'

/** 与网盘其它接口一致，业务成功码为 0 */
export const CLOUD_DRIVE_SUCCESS_CODE = 0
export const UPLOAD_CANCELLED = 'UPLOAD_CANCELLED'

export type SpaceUploadProgressHandler = (progress: number) => void
export type SpaceUploadErrorHandler = (message: string) => void

export interface SpaceFileUploadParams {
  filePath: string
  fileName: string
  fileSize: number
  parentId: string
  fileHash?: string
  taskId?: string
  skipChunks?: number[]
  onProgress?: SpaceUploadProgressHandler
  onError?: SpaceUploadErrorHandler
}

export interface SpaceUploadCheckOutcome {
  uploaded: boolean
  skipChunks: number[]
  fileHash: string
}

const clampProgress = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

export const computeSpaceFileHash = (filePath: string) =>
  invoke<string>('compute_space_file_hash', { param: { filePath } })

export const cancelSpaceFileUpload = (taskId: string) => invoke<boolean>('cancel_space_file_upload', { taskId })

export const isUploadCancelledError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes(UPLOAD_CANCELLED)
}

export const checkSpaceFileUpload = (params: {
  fileHash: string
  fileSize: number
  fileName: string
  parentId: string
}): Promise<SpaceUploadCheckOutcome> => {
  const fileSize = Math.trunc(Number(params.fileSize))
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return Promise.reject(new Error('INVALID_FILE_SIZE'))
  }

  const chunkSize = DEFAULT_FILE_CHUNK_SIZE
  const totalChunk = Math.max(1, Math.ceil(fileSize / chunkSize))

  return spaceUploadApi
    .checkUpload({
      fileHash: params.fileHash,
      fileSize,
      fileName: params.fileName,
      parentId: params.parentId,
      totalChunk
    })
    .then((res) => {
      if (res.code === CLOUD_DRIVE_SUCCESS_CODE && res.data) {
        const skipChunks = (res.data.uploadedChunks ?? []).map(Number).filter(Number.isFinite)
        return {
          uploaded: Boolean(res.data.uploaded),
          skipChunks,
          fileHash: params.fileHash
        }
      }
      throw new Error(res.msg || 'CHECK_FAILED')
    })
}

export const uploadSpaceFileChunks = (params: SpaceFileUploadParams) => {
  if (!params.taskId) {
    params.onError?.('missing taskId')
    return Promise.resolve(null)
  }

  const report = (progress: number) => params.onProgress?.(clampProgress(progress))
  report(0)

  const userStore = useUserStore()
  const systemSettingStore = useSystemSettingStore()
  const taskId = params.taskId

  const unlistenPromise = listen<UploadFileProgressPayload>(SPACE_PROGRESS_EVENT, (event) => {
    if (event.payload.taskId && event.payload.taskId !== taskId) return
    report(event.payload.progress)
  })

  const param: SpaceUploadFileParam = {
    filePath: params.filePath,
    fileName: params.fileName,
    baseUrl: SERVICE_URL,
    authToken: userStore.authInfo.token || '',
    lang: systemSettingStore.preferences.lang || 'zh',
    chunkSize: DEFAULT_FILE_CHUNK_SIZE,
    taskId,
    fileHash: params.fileHash,
    skipChunks: params.skipChunks && params.skipChunks.length > 0 ? params.skipChunks : undefined,
    parentId: params.parentId,
    successCode: CLOUD_DRIVE_SUCCESS_CODE
  }

  return invoke<string>('upload_space_file_chunks', { param })
    .catch((err: unknown) => {
      if (isUploadCancelledError(err)) {
        throw err
      }
      const message = err instanceof Error ? err.message : String(err)
      params.onError?.(message)
      return null
    })
    .then((result) => {
      if (result !== null) report(100)
      return result
    })
    .finally(() => {
      unlistenPromise.then((unlisten) => unlisten())
    })
}

export const uploadSpaceFile = (params: SpaceFileUploadParams) => uploadSpaceFileChunks(params)

export interface SpaceFileUploadWithCheckParams extends SpaceFileUploadParams {
  fileHash: string
}

/** 兼容旧调用：先检查再分片 */
export const uploadSpaceFileWithCheck = (params: SpaceFileUploadWithCheckParams) => {
  return checkSpaceFileUpload({
    fileHash: params.fileHash,
    fileSize: params.fileSize,
    fileName: params.fileName,
    parentId: params.parentId
  })
    .then((outcome) => {
      if (outcome.uploaded) {
        params.onProgress?.(100)
        return ''
      }

      return uploadSpaceFileChunks({
        ...params,
        fileHash: outcome.fileHash,
        skipChunks: outcome.skipChunks
      })
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'check upload failed'
      params.onError?.(msg)
      return null
    })
}

const TEMP_WRITE_CHUNK_SIZE = 2 * 1024 * 1024

/** 大文件禁止整包 arrayBuffer + writeFile，否则 IPC/内存会直接卡死应用 */
export const blobToSpaceTempFile = async (blob: Blob, fileName: string): Promise<string> => {
  const dataDir = await appLocalDataDir()
  const tempDir = await join(dataDir, 'linyu', 'space-uploads')
  await mkdir(tempDir, { recursive: true })

  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  const tempFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const tempPath = await join(tempDir, tempFileName)

  // ReadableStream 路径：插件按块写入，峰值内存可控
  if (typeof (blob as Blob & { stream?: () => ReadableStream<Uint8Array> }).stream === 'function') {
    await writeFile(tempPath, blob.stream())
    return tempPath
  }

  // 兼容回退：按 2MB 切片写入，并让出主线程
  const fileHandle = await open(tempPath, { write: true, create: true, truncate: true })
  try {
    for (let offset = 0; offset < blob.size; offset += TEMP_WRITE_CHUNK_SIZE) {
      const end = Math.min(offset + TEMP_WRITE_CHUNK_SIZE, blob.size)
      const slice = blob.slice(offset, end)
      const buffer = new Uint8Array(await slice.arrayBuffer())
      await fileHandle.write(buffer)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  } finally {
    await fileHandle.close()
  }

  return tempPath
}
