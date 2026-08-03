export interface ApplicationListParam {
  keyword: string
}

export interface Application {
  id: string
  appName: string
  version: string
  description: string
  authorId: string
  author: string
  tags: string[]
  appType: string
  iconUrl: string
  pluginUrl: string
  pluginSha256?: string
  pluginSignature?: string
  webUrl: string
  getCount: number
  score: number
  scoreCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
