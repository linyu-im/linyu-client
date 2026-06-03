/** 企业成员角色，与后端 roles 字段一致 */
export enum EnterpriseMemberRoleEnum {
  Owner = 'owner',
  Admin = 'admin',
  Subadmin = 'subadmin',
  Leader = 'leader',
  Member = 'member'
}

export const ENTERPRISE_MEMBER_ROLE_COLORS: Partial<Record<EnterpriseMemberRoleEnum, string>> = {
  [EnterpriseMemberRoleEnum.Owner]: 'var(--gold)',
  [EnterpriseMemberRoleEnum.Admin]: 'var(--primary-color)',
  [EnterpriseMemberRoleEnum.Subadmin]: 'var(--pink)',
  [EnterpriseMemberRoleEnum.Leader]: 'var(--green)'
}

export function isEnterpriseMemberRole(value: string): value is EnterpriseMemberRoleEnum {
  return (Object.values(EnterpriseMemberRoleEnum) as string[]).includes(value)
}

export function hasEnterpriseMemberRoleTag(role?: string): role is EnterpriseMemberRoleEnum {
  if (!role || !isEnterpriseMemberRole(role)) return false
  return role !== EnterpriseMemberRoleEnum.Member
}
