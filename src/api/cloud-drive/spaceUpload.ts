import type { SpaceUploadCheckParam, SpaceUploadCheckResult } from '@/types/api/spaceUpload'
import { type ApiResponse, post } from '@/utils/network/http'

export function checkUpload(data: SpaceUploadCheckParam): Promise<ApiResponse<SpaceUploadCheckResult>> {
  return post<SpaceUploadCheckResult, SpaceUploadCheckParam>('/api/cloud-drive/v1/space/user/upload/check', data)
}
