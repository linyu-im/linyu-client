import { Emotion } from '@/types/api/emotion'
import { ApiResponse, post } from '@/utils/network/http'

export function list(): Promise<ApiResponse<Emotion[]>> {
  return post<Emotion[], void>('/api/basic/v1/emotion/list')
}
