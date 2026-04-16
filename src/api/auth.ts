import { AccountLoginParam, LoginResult, Oauth2LoginParam } from '@/types/api/auth'
import { ApiResponse, post } from '@/utils/http'

export function accountLogin(params: AccountLoginParam): Promise<ApiResponse<LoginResult>> {
  return post<LoginResult, AccountLoginParam>('/api/auth/v1/login/pwd', params)
}

export function tokenReset(): Promise<ApiResponse<LoginResult>> {
  return post<LoginResult, void>('/api/auth/v1/login/token/reset')
}

export function oauth2Login(params: Oauth2LoginParam): Promise<ApiResponse<LoginResult>> {
  return post<LoginResult, Oauth2LoginParam>('/api/auth/v1/login/oauth2', params)
}
