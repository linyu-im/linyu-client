export interface SpaceDownloadFileParam {
  url: string
  savePath: string
  taskId: string
  chunkSize?: number
}

export interface SpaceDownloadProgressPayload {
  taskId: string
  progress: number
  loadedBytes: number
  totalBytes: number
}
