import type { FileMessageLocalExt } from '@/types/api/message'

export const FILE_MESSAGE_STATUS_DOWNLOADED = 'downloaded'

export const serializeMessageLocalExt = (msgType: string, localExt: unknown): string | undefined => {
  if (msgType !== 'file' || localExt == null) return undefined
  return JSON.stringify(localExt)
}

export const parseMessageLocalExt = (msgType: string, raw?: string): FileMessageLocalExt | undefined => {
  if (msgType !== 'file' || !raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Partial<FileMessageLocalExt>
    if (typeof parsed.status !== 'string') return undefined
    return {
      status: parsed.status,
      localPath: typeof parsed.localPath === 'string' ? parsed.localPath : ''
    }
  } catch {
    return undefined
  }
}
