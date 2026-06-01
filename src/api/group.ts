import { type ApiResponse, post } from '@/utils/http'
import type { GroupInfoRequest, GroupInfoResult } from '@/types/api/group'

export function getGroupAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { groupId: string }>('/api/basic/v1/group/avatar/get', { groupId: id })
}

export function getGroupInfo(data: GroupInfoRequest): Promise<ApiResponse<GroupInfoResult>> {
  return post<GroupInfoResult, GroupInfoRequest>('/api/basic/v1/group/info', data)
}
