import type {
  ApplyAddFriendParam,
  ApplyAddGroupParam,
  ApplyAgreeFriendParam,
  ApplyRejectParam,
  FriendApplyListResult,
  GroupApplyListResult
} from '@/types/api/apply'
import { type ApiResponse, post } from '@/utils/network/http'

export function addFriend(data: ApplyAddFriendParam): Promise<ApiResponse<void>> {
  return post<void, ApplyAddFriendParam>('/api/basic/v1/apply/add/friend', data)
}

export function addGroup(data: ApplyAddGroupParam): Promise<ApiResponse<void>> {
  return post<void, ApplyAddGroupParam>('/api/basic/v1/apply/add/group', data)
}

export function agreeFriend(data: ApplyAgreeFriendParam): Promise<ApiResponse<void>> {
  return post<void, ApplyAgreeFriendParam>('/api/basic/v1/apply/agree/friend', data)
}

export function reject(data: ApplyRejectParam): Promise<ApiResponse<void>> {
  return post<void, ApplyRejectParam>('/api/basic/v1/apply/reject', data)
}

export function friendList(): Promise<ApiResponse<FriendApplyListResult>> {
  return post<FriendApplyListResult, void>('/api/basic/v1/apply/list/friend')
}

export function groupList(): Promise<ApiResponse<GroupApplyListResult>> {
  return post<GroupApplyListResult, void>('/api/basic/v1/apply/list/group')
}
