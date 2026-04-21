import { Chat, ChatDeleteParam, ChatMarkReadParam, ChatMuteParam, ChatTopParam } from '@/types/api/chat'
import { ApiResponse, post } from '@/utils/http'

export function list(): Promise<ApiResponse<Chat[]>> {
  return post<Chat[], void>('/api/basic/v1/chat/list')
}

export function top(data: ChatTopParam): Promise<ApiResponse<void>> {
  return post<void, ChatTopParam>('/api/basic/v1/chat/top', data)
}

export function mute(data: ChatMuteParam): Promise<ApiResponse<void>> {
  return post<void, ChatMuteParam>('/api/basic/v1/chat/mute', data)
}

export function markRead(data: ChatMarkReadParam): Promise<ApiResponse<void>> {
  return post<void, ChatMarkReadParam>('/api/basic/v1/chat/markRead', data)
}

export function remove(data: ChatDeleteParam): Promise<ApiResponse<void>> {
  return post<void, ChatDeleteParam>('/api/basic/v1/chat/delete', data)
}
