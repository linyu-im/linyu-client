import { type ApiResponse, post } from '@/utils/http'
import type { GroupInfoRequest, GroupInfoResult, GroupSearchParam, GroupSearchResult } from '@/types/api/group'
import type { GroupMember } from '@/types/api/groupMember'

export function getGroupAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { groupId: string }>('/api/basic/v1/group/avatar/get', { groupId: id })
}

export function getGroupInfo(data: GroupInfoRequest): Promise<ApiResponse<GroupInfoResult>> {
  return post<GroupInfoResult, GroupInfoRequest>('/api/basic/v1/group/info', data)
}

export function search(params: GroupSearchParam): Promise<ApiResponse<GroupSearchResult>> {
  return post<GroupSearchResult, GroupSearchParam>('/api/basic/v1/group/search', params)
}

export function listMembers(data: GroupInfoRequest): Promise<ApiResponse<GroupMember[]>> {
  return post<GroupMember[], GroupInfoRequest>('/api/basic/v1/group/member/list', data)
}
