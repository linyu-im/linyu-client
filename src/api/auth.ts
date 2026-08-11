import type {
  AccountLoginParam,
  LoginClientParam,
  LoginResult,
  Oauth2LoginParam,
  PasswordVerifyParam
} from '@/types/api/auth'
import { ApiResponse, post } from '@/utils/network/http'
import { getAppPlatform, getAppVersionCode } from '@/utils/app/version'

function withClientMeta<T extends object>(params: T): Promise<T & LoginClientParam> {
  return getAppPlatform().then((platform) => ({
    ...params,
    platform,
    versionCode: getAppVersionCode()
  }))
}

export function accountLogin(params: AccountLoginParam): Promise<ApiResponse<LoginResult>> {
  return withClientMeta(params).then((body) =>
    post<LoginResult, AccountLoginParam & LoginClientParam>('/api/auth/v1/login/pwd', body)
  )
}

export function tokenReset(): Promise<ApiResponse<LoginResult>> {
  return withClientMeta({}).then((body) => post<LoginResult, LoginClientParam>('/api/auth/v1/login/token/reset', body))
}

export function oauth2Login(params: Oauth2LoginParam): Promise<ApiResponse<LoginResult>> {
  return withClientMeta(params).then((body) =>
    post<LoginResult, Oauth2LoginParam & LoginClientParam>('/api/auth/v1/login/oauth2', body)
  )
}

export function verifyPassword(params: PasswordVerifyParam): Promise<ApiResponse<boolean>> {
  return post<boolean, PasswordVerifyParam>('/api/auth/v1/login/password/verify', params)
}
