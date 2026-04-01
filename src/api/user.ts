import { ApiResponse, post } from '@/utils/http'

export function accountLogin(params: AccountLoginParam): Promise<ApiResponse<LoginResult>> {
  return post<LoginResult, AccountLoginParam>('/api/auth/v1/login/pwd', params)
}
