import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { SPACE_DOWNLOAD_FILE_PROGRESS_EVENT as SPACE_PROGRESS_EVENT } from '@/constants/event'
import type { SpaceDownloadFileParam, SpaceDownloadProgressPayload } from '@/types/cmd/download'
import { DEFAULT_FILE_CHUNK_SIZE } from '@/utils/file/fileChunk'

export const DOWNLOAD_CANCELLED = 'DOWNLOAD_CANCELLED'

export type SpaceDownloadProgressHandler = (payload: {
  progress: number
  loadedBytes: number
  totalBytes: number
}) => void

export type SpaceDownloadErrorHandler = (message: string) => void

export interface SpaceFileDownloadParams {
  url: string
  savePath: string
  taskId: string
  chunkSize?: number
  onProgress?: SpaceDownloadProgressHandler
  onError?: SpaceDownloadErrorHandler
}

const clampProgress = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

export const cancelSpaceFileDownload = (taskId: string) => invoke<boolean>('cancel_space_file_download', { taskId })

export const isDownloadCancelledError = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes(DOWNLOAD_CANCELLED)
}

export const downloadSpaceFile = (params: SpaceFileDownloadParams) => {
  const taskId = params.taskId
  let unlisten: (() => void) | undefined
  let lastEmitAt = 0

  return listen<SpaceDownloadProgressPayload>(SPACE_PROGRESS_EVENT, (event) => {
    if (event.payload.taskId !== taskId) return
    const progress = clampProgress(Number(event.payload.progress) || 0)
    const loadedBytes = Math.max(0, Number(event.payload.loadedBytes) || 0)
    const totalBytes = Math.max(0, Number(event.payload.totalBytes) || 0)
    const now = Date.now()
    // 前端再节流一层，防止 IPC 突发打满主线程（完成态强制放行）
    if (progress < 100 && now - lastEmitAt < 120) return
    lastEmitAt = now
    params.onProgress?.({ progress, loadedBytes, totalBytes })
  })
    .then((fn) => {
      unlisten = fn
      const param: SpaceDownloadFileParam = {
        url: params.url,
        savePath: params.savePath,
        taskId,
        chunkSize: params.chunkSize ?? DEFAULT_FILE_CHUNK_SIZE
      }
      return invoke<void>('download_space_file', { param })
    })
    .then(() => true as const)
    .catch((err: unknown) => {
      if (isDownloadCancelledError(err)) {
        throw err
      }
      const message = err instanceof Error ? err.message : String(err)
      params.onError?.(message)
      return null
    })
    .finally(() => {
      unlisten?.()
    })
}
