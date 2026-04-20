import { Chat } from '@/types/api/chat'
import { ApiResponse, post } from '@/utils/http'

export function list(): Promise<ApiResponse<Chat[]>> {
  return post<Chat[], void>('/api/basic/v1/chat/list')
}
