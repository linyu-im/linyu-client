import type { SendMessageToUserParam } from '@/types/api/message'
import { ApiResponse, post } from '@/utils/http'

export function sendToUser(data: SendMessageToUserParam): Promise<ApiResponse<void>> {
  return post<void, SendMessageToUserParam>('/api/basic/v1/message/send/user', data)
}
