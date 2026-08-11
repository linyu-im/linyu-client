/** 校验账号是否已被使用 */
export interface CheckAccountParam {
  account: string
}

/** 注册发送邮箱验证码 */
export interface SendEmailCodeParam {
  email: string
}

/** 邮箱方式注册账号 */
export interface RegisterEmailParam {
  email: string
  code: string
  account: string
  password: string
  confirmPassword: string
}
