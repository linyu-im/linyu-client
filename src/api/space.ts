import type {
  SpaceUserDirCreateParam,
  SpaceUserDirTreeNode,
  SpaceUserFileCategoryStat,
  SpaceUserFileDeleteParam,
  SpaceUserFileDetailParam,
  SpaceUserFileDetailResult,
  SpaceUserFileListParam,
  SpaceUserFileMoveParam,
  SpaceUserFileRenameParam,
  SpaceFile,
  SpaceUserInfoResult
} from '@/types/api/space'
import { type ApiResponse, post } from '@/utils/network/http'

export function getUserInfo(): Promise<ApiResponse<SpaceUserInfoResult>> {
  return post<SpaceUserInfoResult, void>('/api/cloud-drive/v1/space/user/info')
}

export function listSpaceUserFile(data: SpaceUserFileListParam): Promise<ApiResponse<SpaceFile[]>> {
  return post<SpaceFile[], SpaceUserFileListParam>('/api/cloud-drive/v1/space/user/file/list', data)
}

export function listAllSpaceUserFile(data: SpaceUserFileListParam): Promise<ApiResponse<SpaceFile[]>> {
  return post<SpaceFile[], SpaceUserFileListParam>('/api/cloud-drive/v1/space/user/file/list/all', data)
}

export function createSpaceUserDir(data: SpaceUserDirCreateParam): Promise<ApiResponse<void>> {
  return post<void, SpaceUserDirCreateParam>('/api/cloud-drive/v1/space/user/dir/create', data)
}

export function getSpaceUserDirTree(): Promise<ApiResponse<SpaceUserDirTreeNode[]>> {
  return post<SpaceUserDirTreeNode[], void>('/api/cloud-drive/v1/space/user/dir/tree')
}

export function deleteSpaceUserFile(data: SpaceUserFileDeleteParam): Promise<ApiResponse<void>> {
  return post<void, SpaceUserFileDeleteParam>('/api/cloud-drive/v1/space/user/file/delete', data)
}

export function moveSpaceUserFile(data: SpaceUserFileMoveParam): Promise<ApiResponse<null>> {
  return post<null, SpaceUserFileMoveParam>('/api/cloud-drive/v1/space/user/file/move', data)
}

export function renameSpaceUserFile(data: SpaceUserFileRenameParam): Promise<ApiResponse<SpaceFile>> {
  return post<SpaceFile, SpaceUserFileRenameParam>('/api/cloud-drive/v1/space/user/file/rename', data)
}

export function getSpaceUserFileCategoryStats(): Promise<ApiResponse<SpaceUserFileCategoryStat[]>> {
  return post<SpaceUserFileCategoryStat[], void>('/api/cloud-drive/v1/space/user/file/category/stats')
}

export function getSpaceUserFileDetail(
  data: SpaceUserFileDetailParam
): Promise<ApiResponse<SpaceUserFileDetailResult>> {
  return post<SpaceUserFileDetailResult, SpaceUserFileDetailParam>('/api/cloud-drive/v1/space/user/file/detail', data)
}
