import { UserInfoResult } from '@/types/api/user'
import { ApiResponse, post } from '@/utils/http'

export function currentUserInfo(): Promise<ApiResponse<UserInfoResult>> {
  return post<UserInfoResult, void>('/api/basic/v1/user/current/info')
}

export function userEmotionSet(id: string): Promise<ApiResponse<void>> {
  return post<void, { emotionId: string }>('/api/basic/v1/user/emotion/set', { emotionId: id })
}
