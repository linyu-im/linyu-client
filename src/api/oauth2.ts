import { Oauth2UrlParam, Oauth2UrlResult } from '@/types/api/oauth2'
import { ApiResponse, post } from '@/utils/http'

export function oauth2Url(params: Oauth2UrlParam): Promise<ApiResponse<Oauth2UrlResult>> {
  return post<Oauth2UrlResult, Oauth2UrlParam>('/api/auth/v1/oauth2/url', params)
}
