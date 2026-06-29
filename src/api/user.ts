import type { UserInfoParam, UserInfoResult, UserProfileUpdateParam } from '@/types/api/user'
import { type ApiResponse, formData, post } from '@/utils/http'

export function currentUserInfo(): Promise<ApiResponse<UserInfoResult>> {
  return post<UserInfoResult, void>('/api/basic/v1/user/current/info')
}

export function getUserInfo(params: UserInfoParam): Promise<ApiResponse<UserInfoResult>> {
  return post<UserInfoResult, UserInfoParam>('/api/basic/v1/user/info', params)
}

export function userEmotionSet(id: string): Promise<ApiResponse<void>> {
  return post<void, { emotionId: string }>('/api/basic/v1/user/emotion/set', { emotionId: id })
}

export function getUserAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { userId: string }>('/api/basic/v1/user/avatar/get', { userId: id })
}

export function uploadAvatar(file: Blob, fileName = 'avatar.jpg'): Promise<ApiResponse<string>> {
  const body = new FormData()
  body.append('file', file, fileName)
  return formData<string>('/api/basic/v1/user/avatar/upload', body)
}

export function updateProfile(data: UserProfileUpdateParam): Promise<ApiResponse<void>> {
  return post<void, UserProfileUpdateParam>('/api/basic/v1/user/profile/update', data)
}
