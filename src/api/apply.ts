import type { FriendApplyListResult } from '@/types/api/apply'
import { type ApiResponse, post } from '@/utils/http'

export function friendList(): Promise<ApiResponse<FriendApplyListResult>> {
  return post<FriendApplyListResult, void>('/api/basic/v1/apply/list/friend')
}
