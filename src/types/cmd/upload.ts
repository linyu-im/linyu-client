export interface FileChunkUploadParam {
  filePath: string
  fileName: string
  baseUrl: string
  authToken: string
  lang: string
  chunkSize?: number
  tempFile?: boolean
  chunkUploadUrl?: string
  mergeUrl?: string
  successCode?: number
  skipChunks?: number[]
  mergeExtra?: Record<string, unknown>
}

export interface UploadFileProgressPayload {
  progress: number
  fileHash: string
}
