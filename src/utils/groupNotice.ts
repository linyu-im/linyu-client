import { useGroupNoticeStore } from '@/stores/chat/groupNotice'
import { createGroupNoticeWindow } from '@/utils/window'

export const openGroupNotice = (groupId: string, groupName: string) => {
  if (!groupId) return
  const groupNoticeStore = useGroupNoticeStore()
  groupNoticeStore.open(groupId, groupName)
  createGroupNoticeWindow()
}
