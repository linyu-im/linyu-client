import { useSearchChatRecordStore } from '@/stores/chat/searchChatRecord'
import { createSearchChatRecordWindow } from '@/utils/desktop/window'

export const openSearchChatRecord = (keyword?: string) => {
  const searchChatRecordStore = useSearchChatRecordStore()
  searchChatRecordStore.setKeyword(keyword?.trim() || '')
  createSearchChatRecordWindow()
}
