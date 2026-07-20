export interface FileChunkItem {
  index: number
  chunk: Blob
}

export interface FileChunkOptions {
  chunkSize?: number
}

export const DEFAULT_FILE_CHUNK_SIZE = 5 * 1024 * 1024

export const splitFileToChunks = (file: Blob, options?: FileChunkOptions): FileChunkItem[] => {
  const chunkSize = Math.max(1, options?.chunkSize ?? DEFAULT_FILE_CHUNK_SIZE)
  const chunks: FileChunkItem[] = []

  for (let offset = 0, index = 0; offset < file.size; offset += chunkSize, index += 1) {
    chunks.push({
      index,
      chunk: file.slice(offset, Math.min(offset + chunkSize, file.size))
    })
  }

  return chunks
}

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')

export const calculateFileSha256 = async (file: Blob): Promise<string> => {
  const payload = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', payload)
  return toHex(digest)
}
