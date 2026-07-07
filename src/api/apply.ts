import type {
  ApplyAddFriendParam,
  ApplyAddGroupParam,
  FriendApplyListResult,
  GroupApplyListResult
} from '@/types/api/apply'
import { type ApiResponse, post } from '@/utils/http'

export function addFriend(data: ApplyAddFriendParam): Promise<ApiResponse<void>> {
  return post<void, ApplyAddFriendParam>('/api/basic/v1/apply/add/friend', data)
}

export function addGroup(data: ApplyAddGroupParam): Promise<ApiResponse<void>> {
  return post<void, ApplyAddGroupParam>('/api/basic/v1/apply/add/group', data)
}

export function friendList(): Promise<ApiResponse<FriendApplyListResult>> {
  return post<FriendApplyListResult, void>('/api/basic/v1/apply/list/friend')
}

export function groupList(): Promise<ApiResponse<GroupApplyListResult>> {
  return post<GroupApplyListResult, void>('/api/basic/v1/apply/list/group')
}
