import { EmotionListResult } from '@/types/api/emotion'
import { ApiResponse, post } from '@/utils/http'

export function list(): Promise<ApiResponse<EmotionListResult[]>> {
  return post<EmotionListResult[], void>('/api/basic/v1/emotion/list')
}
