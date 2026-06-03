import type { FriendApplyListResult, GroupApplyListResult } from '@/types/api/apply'
import { type ApiResponse, post } from '@/utils/http'

export function friendList(): Promise<ApiResponse<FriendApplyListResult>> {
  return post<FriendApplyListResult, void>('/api/basic/v1/apply/list/friend')
}

export function groupList(): Promise<ApiResponse<GroupApplyListResult>> {
  return post<GroupApplyListResult, void>('/api/basic/v1/apply/list/group')
}
