import { post } from '@/utils/http'
import type { Application, ApplicationListParam } from '@/types/api/application'

export function list(data: ApplicationListParam) {
  return post<Application[], ApplicationListParam>('/api/basic/v1/application/list', data)
}
