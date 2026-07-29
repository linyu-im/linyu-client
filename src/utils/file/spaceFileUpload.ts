import { spaceUploadApi } from '@/api'
import { DEFAULT_FILE_CHUNK_SIZE } from '@/utils/file/fileChunk'
import {
  type FileChunkUploadExtra,
  type MessageMediaUploadOptions,
  invokeChunkUpload
} from '@/utils/message/messageMediaUpload'
import { appDataDir, join } from '@tauri-apps/api/path'
import { mkdir, writeFile } from '@tauri-apps/plugin-fs'

const CLOUD_DRIVE_CHUNK_UPLOAD_URL = '/api/cloud-drive/v1/space/user/upload/chunk'
const CLOUD_DRIVE_MERGE_URL = '/api/cloud-drive/v1/space/user/upload/merge'
const CLOUD_DRIVE_SUCCESS_CODE = 200

export interface SpaceFileUploadParams {
  filePath: string
  fileName: string
  fileSize: number
  parentId: string
  onProgress?: (progress: number) => void
  onError?: (message: string) => void
}

export const uploadSpaceFile = (params: SpaceFileUploadParams) => {
  const chunkSize = DEFAULT_FILE_CHUNK_SIZE

  const options: MessageMediaUploadOptions = {
    onProgress: params.onProgress,
    onError: params.onError
  }

  const extra: FileChunkUploadExtra = {
    chunkUploadUrl: CLOUD_DRIVE_CHUNK_UPLOAD_URL,
    mergeUrl: CLOUD_DRIVE_MERGE_URL,
    successCode: CLOUD_DRIVE_SUCCESS_CODE,
    chunkSize,
    mergeExtra: { parentId: params.parentId, fileSize: params.fileSize }
  }

  return invokeChunkUpload(params.filePath, params.fileName, options, false, extra)
}

export interface SpaceFileUploadWithCheckParams extends SpaceFileUploadParams {
  fileHash: string
}

export const uploadSpaceFileWithCheck = (params: SpaceFileUploadWithCheckParams) => {
  const chunkSize = DEFAULT_FILE_CHUNK_SIZE
  const totalChunk = Math.ceil(params.fileSize / chunkSize)

  return spaceUploadApi
    .checkUpload({
      fileHash: params.fileHash,
      fileSize: params.fileSize,
      fileName: params.fileName,
      parentId: params.parentId,
      totalChunk
    })
    .then((res) => {
      if (res.code === CLOUD_DRIVE_SUCCESS_CODE && res.data) {
        if (res.data.uploaded) {
          params.onProgress?.(100)
          return ''
        }

        const skipChunks = (res.data.uploadedChunks ?? []).map(Number).filter(Number.isFinite)

        const options: MessageMediaUploadOptions = {
          onProgress: params.onProgress,
          onError: params.onError
        }

        const extra: FileChunkUploadExtra = {
          chunkUploadUrl: CLOUD_DRIVE_CHUNK_UPLOAD_URL,
          mergeUrl: CLOUD_DRIVE_MERGE_URL,
          successCode: CLOUD_DRIVE_SUCCESS_CODE,
          chunkSize,
          skipChunks: skipChunks.length > 0 ? skipChunks : undefined,
          mergeExtra: { parentId: params.parentId, fileSize: params.fileSize }
        }

        return invokeChunkUpload(params.filePath, params.fileName, options, false, extra)
      }

      const msg = res.msg || 'check upload failed'
      params.onError?.(msg)
      return null
    })
}

export const blobToSpaceTempFile = async (blob: Blob, fileName: string): Promise<string> => {
  const dataDir = await appDataDir()
  const tempDir = await join(dataDir, 'linyu', 'space-uploads')
  await mkdir(tempDir, { recursive: true })

  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  const tempFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
  const tempPath = await join(tempDir, tempFileName)

  const buffer = await blob.arrayBuffer()
  await writeFile(tempPath, new Uint8Array(buffer))

  return tempPath
}
