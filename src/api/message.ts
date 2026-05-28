import type {
  MergeMessageFileParam,
  Message,
  MessagePageParam,
  MessagePageResult,
  SendMessageToUserParam,
  UploadMessageFileChunkParam
} from '@/types/api/message'
import { ApiResponse, formData, post } from '@/utils/http'

export function sendToUser(data: SendMessageToUserParam): Promise<ApiResponse<Message>> {
  return post<Message, SendMessageToUserParam>('/api/basic/v1/message/send/user', data)
}

export function page(data: MessagePageParam): Promise<ApiResponse<MessagePageResult>> {
  return post<MessagePageResult, MessagePageParam>('/api/basic/v1/message/page', data)
}

export function uploadFileChunk(data: UploadMessageFileChunkParam): Promise<ApiResponse<void>> {
  const payload = new FormData()
  payload.append('fileHash', data.fileHash)
  payload.append('chunkIndex', data.chunkIndex)
  payload.append('file', data.file, `chunk-${data.chunkIndex}`)
  return formData<void>('/api/basic/v1/message/file/upload', payload)
}

export function mergeFileChunks(data: MergeMessageFileParam): Promise<ApiResponse<string>> {
  return post<string, MergeMessageFileParam>('/api/basic/v1/message/file/merge', data)
}
