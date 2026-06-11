import { messageApi } from '@/api'
import { calculateFileSha256, splitFileToChunks } from '@/utils/fileChunk'

export const uploadMessageMediaBlob = (blob: Blob, fileName: string) => {
  return calculateFileSha256(blob).then((fileHash) => {
    const chunks = splitFileToChunks(blob)
    if (!chunks.length) return Promise.resolve(null)

    let chain: Promise<boolean> = Promise.resolve(true)
    for (const item of chunks) {
      chain = chain.then(() =>
        messageApi
          .uploadFileChunk({
            fileHash,
            chunkIndex: String(item.index),
            file: item.chunk
          })
          .then((uploadRes) => uploadRes.code === 0)
      )
    }

    return chain.then((uploaded) => {
      if (!uploaded) return null
      return messageApi
        .mergeFileChunks({
          fileHash,
          fileSize: blob.size,
          fileName,
          totalChunk: chunks.length
        })
        .then((mergeRes) => {
          if (mergeRes.code !== 0 || !mergeRes.data) return null
          return mergeRes.data
        })
    })
  })
}
