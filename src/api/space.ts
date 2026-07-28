import type {
  SpaceUserDirCreateParam,
  SpaceUserFileDeleteParam,
  SpaceUserFileListParam,
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

export function createSpaceUserDir(data: SpaceUserDirCreateParam): Promise<ApiResponse<void>> {
  return post<void, SpaceUserDirCreateParam>('/api/cloud-drive/v1/space/user/dir/create', data)
}

export function deleteSpaceUserFile(data: SpaceUserFileDeleteParam): Promise<ApiResponse<void>> {
  return post<void, SpaceUserFileDeleteParam>('/api/cloud-drive/v1/space/user/file/delete', data)
}
