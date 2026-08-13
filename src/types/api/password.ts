/** 找回/重置密码发送邮箱验证码 */
export interface ResetPasswordEmailCodeParam {
  email: string
}

/** 邮箱验证码找回/重置密码 */
export interface ResetPasswordParam {
  email: string
  code: string
  password: string
  confirmPassword: string
}
