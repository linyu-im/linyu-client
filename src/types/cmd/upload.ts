export interface MessageUploadFileParam {
  filePath: string
  fileName: string
  baseUrl: string
  authToken: string
  lang: string
  chunkSize?: number
  tempFile?: boolean
}

export interface SpaceUploadFileParam {
  filePath: string
  fileName: string
  baseUrl: string
  authToken: string
  lang: string
  chunkSize?: number
  taskId: string
  fileHash?: string
  skipChunks?: number[]
  parentId: string
  successCode?: number
}

export interface ComputeSpaceFileHashParam {
  filePath: string
}

export interface UploadFileProgressPayload {
  progress: number
  fileHash: string
  taskId?: string
}

/** @deprecated 兼容旧类型名，请优先使用 MessageUploadFileParam / SpaceUploadFileParam */
export type FileChunkUploadParam = MessageUploadFileParam & Partial<SpaceUploadFileParam>
