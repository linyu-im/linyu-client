import { post } from '@/utils/network/http'
import type { Application, ApplicationListParam } from '@/types/api/application'

export function list(data: ApplicationListParam) {
  return post<Application[], ApplicationListParam>('/api/application/v1/list', data)
}
