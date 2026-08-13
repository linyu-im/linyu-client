import { post } from '@/utils/network/http'
import type { ResetPasswordEmailCodeParam, ResetPasswordParam } from '@/types/api/password'

/** 找回/重置密码发送邮箱验证码 */
export function sendEmailCode(params: ResetPasswordEmailCodeParam) {
  return post<void, ResetPasswordEmailCodeParam>('/api/auth/v1/password/email/code', params)
}

/** 邮箱验证码找回/重置密码 */
export function reset(params: ResetPasswordParam) {
  return post<void, ResetPasswordParam>('/api/auth/v1/password/reset', params)
}
