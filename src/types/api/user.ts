// 账号密码登录参数
export interface AccountLoginParam {
  account: string
  password: string
}

// 登录结果
export interface LoginResult {
  userId: string
  token: string
}

// OAuth2登录参数
export interface Oauth2LoginParam {
  code: string
  type: string
}
