// 账号密码登录参数
interface AccountLoginParam {
  account: string
  password: string
}

// 登录结果
interface LoginResult {
  userId: string
  token: string
}
