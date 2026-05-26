import type { Message, MessagePageParam, MessagePageResult, SendMessageToUserParam } from '@/types/api/message'
import { ApiResponse, post } from '@/utils/http'

export function sendToUser(data: SendMessageToUserParam): Promise<ApiResponse<Message>> {
  return post<Message, SendMessageToUserParam>('/api/basic/v1/message/send/user', data)
}

export function page(data: MessagePageParam): Promise<ApiResponse<MessagePageResult>> {
  return post<MessagePageResult, MessagePageParam>('/api/basic/v1/message/page', data)
}
