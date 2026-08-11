// 登录客户端信息（各登录接口共用）
export interface LoginClientParam {
  platform: string
  versionCode: number
}

// 账号密码登录参数
export interface AccountLoginParam {
  account: string
  password: string
}

// 登录结果
export interface LoginResult {
  userId: string
  account: string
  token: string
}

// OAuth2登录参数
export interface Oauth2LoginParam {
  code: string
  type: string
}

// 密码验证参数
export interface PasswordVerifyParam {
  password: string
}
