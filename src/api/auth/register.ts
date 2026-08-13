import { post } from '@/utils/network/http'
import type { CheckAccountParam, RegisterEmailParam, SendEmailCodeParam } from '@/types/api/register'

/** 校验账号是否已被使用，data 为 true 表示已被使用 */
export function checkAccount(params: CheckAccountParam) {
  return post<boolean, CheckAccountParam>('/api/auth/v1/register/account/check', params)
}

/** 注册发送邮箱验证码 */
export function sendEmailCode(params: SendEmailCodeParam) {
  return post<void, SendEmailCodeParam>('/api/auth/v1/register/email/code', params)
}

/** 邮箱方式注册账号 */
export function registerEmail(params: RegisterEmailParam) {
  return post<void, RegisterEmailParam>('/api/auth/v1/register/email', params)
}
