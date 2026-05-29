import type { ContactsListResult } from '@/types/api/contacts'
import { type ApiResponse, post } from '@/utils/http'

export function friendList(): Promise<ApiResponse<ContactsListResult>> {
  return post<ContactsListResult, void>('/api/basic/v1/contacts/friend/list')
}

export function groupList(): Promise<ApiResponse<ContactsListResult>> {
  return post<ContactsListResult, void>('/api/basic/v1/contacts/group/list')
}
