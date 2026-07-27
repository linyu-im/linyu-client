/** 通知类型，与后端一致 */
export const NoticeType = {
  /** 群相关通知 */
  Group: 'group'
} as const

export type NoticeType = (typeof NoticeType)[keyof typeof NoticeType]

/** 群通知事件状态，与后端一致 */
export const GroupNoticeExtraStatus = {
  /** 解散群聊 */
  Dissolve: 'dissolve',
  /** 被移出群聊 */
  Remove: 'remove',
  /** 主动退出群聊 */
  Leave: 'leave'
} as const

export type GroupNoticeExtraStatus = (typeof GroupNoticeExtraStatus)[keyof typeof GroupNoticeExtraStatus]

/** 通知来源，与后端一致 */
export const NoticeSource = {
  /** 系统 */
  System: 'system'
} as const

export type NoticeSource = (typeof NoticeSource)[keyof typeof NoticeSource]
