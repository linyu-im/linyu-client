import type { AppVersionCheckParam, AppVersionCheckResult } from '@/types/api/appVersion'
import { post } from '@/utils/network/http'

export function check(params: AppVersionCheckParam) {
  return post<AppVersionCheckResult, AppVersionCheckParam>('/api/basic/v1/app/version/check', params)
}
