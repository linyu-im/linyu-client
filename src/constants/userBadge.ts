/** 用户红点 badgeCode，与后端一致 */
export const UserBadgeCode = {
  /** 新的好友 */
  NewFriend: 'new-friend',
  /** 群聊通知 */
  GroupNotion: 'group-notion'
} as const

export type UserBadgeCode = (typeof UserBadgeCode)[keyof typeof UserBadgeCode]

export function isUserBadgeCode(value: string): value is UserBadgeCode {
  return (Object.values(UserBadgeCode) as string[]).includes(value)
}
