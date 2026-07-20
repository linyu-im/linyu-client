import type {
  ContactsFriendIsParam,
  ContactsListResult,
  ContactsRemarkUpdateParam,
  ContactsTagUpdateParam
} from '@/types/api/contacts'
import { type ApiResponse, post } from '@/utils/network/http'

export function friendList(): Promise<ApiResponse<ContactsListResult>> {
  return post<ContactsListResult, void>('/api/basic/v1/contacts/friend/list')
}

export function groupList(): Promise<ApiResponse<ContactsListResult>> {
  return post<ContactsListResult, void>('/api/basic/v1/contacts/group/list')
}

export function enterpriseList(): Promise<ApiResponse<ContactsListResult>> {
  return post<ContactsListResult, void>('/api/basic/v1/contacts/enterprise/list')
}

export function isFriend(data: ContactsFriendIsParam): Promise<ApiResponse<boolean>> {
  return post<boolean, ContactsFriendIsParam>('/api/basic/v1/contacts/friend/is', data)
}

export function deleteFriend(data: ContactsFriendIsParam): Promise<ApiResponse<void>> {
  return post<void, ContactsFriendIsParam>('/api/basic/v1/contacts/friend/delete', data)
}

export function updateRemark(data: ContactsRemarkUpdateParam): Promise<ApiResponse<void>> {
  return post<void, ContactsRemarkUpdateParam>('/api/basic/v1/contacts/remark/update', data)
}

export function updateTag(data: ContactsTagUpdateParam): Promise<ApiResponse<void>> {
  return post<void, ContactsTagUpdateParam>('/api/basic/v1/contacts/tag/update', data)
}
