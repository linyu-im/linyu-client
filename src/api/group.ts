import { type ApiResponse, post } from '@/utils/http'

export function getGroupAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { groupId: string }>('/api/basic/v1/group/avatar/get', { groupId: id })
}
