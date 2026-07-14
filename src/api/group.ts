import { type ApiResponse, formData, post } from '@/utils/http'
import type {
  Group,
  GroupCreateParam,
  GroupInfoRequest,
  GroupInfoResult,
  GroupInviteMemberParam,
  GroupMemberInfoParam,
  GroupNotice,
  GroupNoticeAddParam,
  GroupNoticeDeleteParam,
  GroupNoticeUpdateParam,
  GroupRemoveMemberParam,
  GroupSearchParam,
  GroupSetAdminParam,
  GroupSearchResult,
  GroupTransferOwnerParam,
  GroupUpdateInfoParam,
  GroupUpdateNicknameParam
} from '@/types/api/group'
import type { GroupMember } from '@/types/api/groupMember'

export function getGroupAvatar(id: string): Promise<ApiResponse<string>> {
  return post<string, { groupId: string }>('/api/basic/v1/group/avatar/get', { groupId: id })
}

export function getGroupInfo(data: GroupInfoRequest): Promise<ApiResponse<GroupInfoResult>> {
  return post<GroupInfoResult, GroupInfoRequest>('/api/basic/v1/group/info', data)
}

export function search(params: GroupSearchParam): Promise<ApiResponse<GroupSearchResult>> {
  return post<GroupSearchResult, GroupSearchParam>('/api/basic/v1/group/search', params)
}

export function listMembers(data: GroupInfoRequest): Promise<ApiResponse<GroupMember[]>> {
  return post<GroupMember[], GroupInfoRequest>('/api/basic/v1/group/member/list', data)
}

export function getMemberInfo(data: GroupMemberInfoParam): Promise<ApiResponse<GroupMember>> {
  return post<GroupMember, GroupMemberInfoParam>('/api/basic/v1/group/member/info', data)
}

export function create(data: GroupCreateParam): Promise<ApiResponse<Group>> {
  return post<Group, GroupCreateParam>('/api/basic/v1/group/create', data)
}

export function updateInfo(data: GroupUpdateInfoParam): Promise<ApiResponse<void>> {
  return post<void, GroupUpdateInfoParam>('/api/basic/v1/group/info/update', data)
}

export function updateNickname(data: GroupUpdateNicknameParam): Promise<ApiResponse<void>> {
  return post<void, GroupUpdateNicknameParam>('/api/basic/v1/group/nickname/update', data)
}

export function uploadAvatar(file: Blob, groupId: string, fileName = 'avatar.jpg'): Promise<ApiResponse<string>> {
  const body = new FormData()
  body.append('file', file, fileName)
  body.append('groupId', groupId)
  return formData<string>('/api/basic/v1/group/avatar/upload', body)
}

export function inviteMember(data: GroupInviteMemberParam): Promise<ApiResponse<void>> {
  return post<void, GroupInviteMemberParam>('/api/basic/v1/group/invite-member', data)
}

export function removeMember(data: GroupRemoveMemberParam): Promise<ApiResponse<void>> {
  return post<void, GroupRemoveMemberParam>('/api/basic/v1/group/remove-member', data)
}

export function isAdmin(data: GroupInfoRequest): Promise<ApiResponse<boolean>> {
  return post<boolean, GroupInfoRequest>('/api/basic/v1/group/is-admin', data)
}

export function dissolve(data: GroupInfoRequest): Promise<ApiResponse<void>> {
  return post<void, GroupInfoRequest>('/api/basic/v1/group/dissolve', data)
}

export function leave(data: GroupInfoRequest): Promise<ApiResponse<void>> {
  return post<void, GroupInfoRequest>('/api/basic/v1/group/leave', data)
}

export function setAdmin(data: GroupSetAdminParam): Promise<ApiResponse<void>> {
  return post<void, GroupSetAdminParam>('/api/basic/v1/group/set-admin', data)
}

export function transferOwner(data: GroupTransferOwnerParam): Promise<ApiResponse<void>> {
  return post<void, GroupTransferOwnerParam>('/api/basic/v1/group/transfer-owner', data)
}

export function listNotices(data: GroupInfoRequest): Promise<ApiResponse<GroupNotice[]>> {
  return post<GroupNotice[], GroupInfoRequest>('/api/basic/v1/group/notice/list', data)
}

export function addNotice(data: GroupNoticeAddParam): Promise<ApiResponse<void>> {
  return post<void, GroupNoticeAddParam>('/api/basic/v1/group/notice/add', data)
}

export function updateNotice(data: GroupNoticeUpdateParam): Promise<ApiResponse<void>> {
  return post<void, GroupNoticeUpdateParam>('/api/basic/v1/group/notice/update', data)
}

export function deleteNotice(data: GroupNoticeDeleteParam): Promise<ApiResponse<void>> {
  return post<void, GroupNoticeDeleteParam>('/api/basic/v1/group/notice/delete', data)
}
