import type { EnterprisInfo, EnterprisInfoRequest } from '@/types/api/enterprise'
import type { EnterpriseDepartment } from '@/types/api/enterpriseDepartment'
import { type ApiResponse, post } from '@/utils/network/http'

export function getEnterpriseAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { enterpriseId: string }>('/api/basic/v1/enterprise/avatar/get', { enterpriseId: id })
}

export function getEnterpriseInfo(data: EnterprisInfoRequest): Promise<ApiResponse<EnterprisInfo>> {
  return post<EnterprisInfo, EnterprisInfoRequest>('/api/basic/v1/enterprise/info', data)
}

export function getEnterpriseDepartment(data: EnterprisInfoRequest): Promise<ApiResponse<EnterpriseDepartment[]>> {
  return post<EnterpriseDepartment[], EnterprisInfoRequest>('/api/basic/v1/enterprise/department', data)
}
