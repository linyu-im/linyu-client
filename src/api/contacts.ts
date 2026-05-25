import type { ContactsListResult } from '@/types/api/contacts'
import { type ApiResponse, post } from '@/utils/http'

export function list(): Promise<ApiResponse<ContactsListResult>> {
  return post<ContactsListResult, void>('/api/basic/v1/contacts/list')
}
