import { Emotonn } from '@/types/api/emotion'
import { ApiResponse, post } from '@/utils/http'

export function list(): Promise<ApiResponse<Emotonn[]>> {
  return post<Emotonn[], void>('/api/basic/v1/emotion/list')
}
