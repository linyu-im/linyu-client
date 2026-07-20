import { useGroupNoticeStore } from '@/stores/chat/groupNotice'
import { createGroupNoticeWindow } from '@/utils/desktop/window'

export const openGroupNotice = (groupId: string, groupName: string) => {
  if (!groupId) return
  const groupNoticeStore = useGroupNoticeStore()
  groupNoticeStore.open(groupId, groupName)
  createGroupNoticeWindow()
}
