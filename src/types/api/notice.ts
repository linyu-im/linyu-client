import type { GroupNoticeExtraStatus, NoticeSource, NoticeType } from '@/constants/notice'

/** 群相关通知扩展 */
export interface GroupNoticeExtra {
  status: GroupNoticeExtraStatus
  groupId: string
  leaveUserId: string
}

type NoticeExtraMap = {
  group: GroupNoticeExtra
}

export type Notice = {
  [K in keyof NoticeExtraMap]: {
    id: string
    userId: string
    senderId: string
    type: K
    noticeSource: NoticeSource | string
    extra: NoticeExtraMap[K]
    createdAt: string
    updatedAt: string
    deletedAt: string | null
  }
}[keyof NoticeExtraMap]

export type NoticeExtra = NoticeExtraMap[NoticeType]

export type NoticeListResult = Notice[]
