const blobUrlToFilePath = new Map<string, string>()

export const registerBlobFilePath = (blobUrl: string, filePath: string) => {
  blobUrlToFilePath.set(blobUrl, filePath)
}

export const getBlobFilePath = (blobUrl: string): string | undefined => {
  return blobUrlToFilePath.get(blobUrl)
}

export const unregisterBlobFilePath = (blobUrl: string) => {
  blobUrlToFilePath.delete(blobUrl)
}
