import type { EnterpriseMember } from './enterpriseMember'

export interface EnterpriseDepartment {
  id: string
  enterpriseId: string
  parentId: string
  name: string
  describe: string
  leaderUserId: string
  sort: number
  level: number
  memberNum: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  leaderUsername: string
  members?: EnterpriseMember[]
}
