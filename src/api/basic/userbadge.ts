import type { UserBadgeListResult } from '@/types/api/userBadge'
import { type ApiResponse, post } from '@/utils/network/http'

export function list(): Promise<ApiResponse<UserBadgeListResult>> {
  return post<UserBadgeListResult, void>('/api/basic/v1/user-badge/list')
}
