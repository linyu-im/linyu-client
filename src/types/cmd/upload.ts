export interface UploadFileChunksParam {
  filePath: string
  fileName: string
  baseUrl: string
  authToken: string
  lang: string
  chunkSize?: number
  tempFile?: boolean
}

export interface UploadFileProgressPayload {
  progress: number
  fileHash: string
}
