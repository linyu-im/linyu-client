import type { NoticeListResult } from '@/types/api/notice'
import { type ApiResponse, post } from '@/utils/network/http'

export function listGroup(): Promise<ApiResponse<NoticeListResult>> {
  return post<NoticeListResult, void>('/api/basic/v1/notice/list/group')
}
