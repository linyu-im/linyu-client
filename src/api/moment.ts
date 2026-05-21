import type { MomentPageParam, MomentPageResult } from '@/types/api/moment'
import { ApiResponse, post } from '@/utils/http'

export function page(data: MomentPageParam): Promise<ApiResponse<MomentPageResult>> {
  return post<MomentPageResult, MomentPageParam>('/api/basic/v1/moment/page', data)
}
