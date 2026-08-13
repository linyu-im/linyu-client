import type { SpaceRecycle, SpaceUserRecycleDeleteParam, SpaceUserRecycleRestoreParam } from '@/types/api/spaceRecycle'
import { type ApiResponse, post } from '@/utils/network/http'

export function listSpaceUserRecycle(): Promise<ApiResponse<SpaceRecycle[]>> {
  return post<SpaceRecycle[], void>('/api/cloud-drive/v1/space-recycle/user/list')
}

export function restoreSpaceUserRecycle(data: SpaceUserRecycleRestoreParam): Promise<ApiResponse<void>> {
  return post<void, SpaceUserRecycleRestoreParam>('/api/cloud-drive/v1/space-recycle/user/restore', data)
}

export function deleteSpaceUserRecycle(data: SpaceUserRecycleDeleteParam): Promise<ApiResponse<void>> {
  return post<void, SpaceUserRecycleDeleteParam>('/api/cloud-drive/v1/space-recycle/user/delete', data)
}

export function clearSpaceUserRecycle(): Promise<ApiResponse<void>> {
  return post<void, void>('/api/cloud-drive/v1/space-recycle/user/clear')
}
