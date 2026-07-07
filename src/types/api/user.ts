import type { Moment } from '@/types/api/moment'

export interface UserInfoParam {
  userId: string
}

export interface UserSearchParam {
  keyword: string
  page: number
  pageSize: number
}

export interface UserSearchResult {
  records: User[]
  total: number
  page: number
  pageSize: number
  totalPage: number
}

export interface UserProfileUpdateParam {
  username: string
  gender: string
  birthday: string
  signature: string
  location: string
}

export interface User {
  id: string
  username: string
  account: string
  phone: string | null
  email: string | null
  gitee: string | null
  gender: string
  avatar: string
  userLevel: number
  signature: string
  location: string
  momentBgUrl: string
  birthday: string
  emotionId: string
  status: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  emotionName: string
  emotionUrl: string
  remark: string
  tag?: string
  moment: Moment | null
}
