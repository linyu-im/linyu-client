import type { EnterpriseMember } from './enterpriseMember'

export interface EnterprisInfoRequest {
  enterpriseId: string
}

export interface Enterpris {
  id: string
  creatorUserId: string
  enterpriseNumber: string
  location: string
  name: string
  avatar: string
  describe: string
  ownerUserId: string
  enterpriseTag: string
  memberNum: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  roles: string
}

export interface EnterprisInfo extends Enterpris {
  userEnterpriseMembers: EnterpriseMember[]
}
