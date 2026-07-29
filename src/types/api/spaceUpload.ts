export interface SpaceUploadCheckParam {
  fileHash: string
  fileSize: number
  fileName: string
  parentId: string
  totalChunk: number
}

export interface SpaceUploadCheckResult {
  uploaded: boolean
  uploadedChunks: string[] | null
}
