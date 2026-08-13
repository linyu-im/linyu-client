import type {
  MomentComment,
  MomentCommentAddParam,
  MomentCommentDelParam,
  MomentCreateParam,
  MomentDeleteParam,
  MomentLike,
  MomentLikeParam,
  MomentPageParam,
  MomentPageResult,
  MomentSettingGetParam,
  MomentSettingResult
} from '@/types/api/moment'
import { type ApiResponse, formData, post } from '@/utils/network/http'

export function create(data: MomentCreateParam): Promise<ApiResponse<void>> {
  return post<void, MomentCreateParam>('/api/basic/v1/moment/create', data)
}

export function page(data: MomentPageParam): Promise<ApiResponse<MomentPageResult>> {
  return post<MomentPageResult, MomentPageParam>('/api/basic/v1/moment/page', data)
}

export function likeAdd(data: MomentLikeParam): Promise<ApiResponse<MomentLike>> {
  return post<MomentLike, MomentLikeParam>('/api/basic/v1/moment/like/add', data)
}

export function likeCancel(data: MomentLikeParam): Promise<ApiResponse<void>> {
  return post<void, MomentLikeParam>('/api/basic/v1/moment/like/cancel', data)
}

export function commentAdd(data: MomentCommentAddParam): Promise<ApiResponse<MomentComment>> {
  return post<MomentComment, MomentCommentAddParam>('/api/basic/v1/moment/comment/add', data)
}

export function commentDel(data: MomentCommentDelParam): Promise<ApiResponse<void>> {
  return post<void, MomentCommentDelParam>('/api/basic/v1/moment/comment/del', data)
}

export function remove(data: MomentDeleteParam): Promise<ApiResponse<void>> {
  return post<void, MomentDeleteParam>('/api/basic/v1/moment/delete', data)
}

export function uploadBackground(file: Blob, fileName = 'background.jpg'): Promise<ApiResponse<void>> {
  const body = new FormData()
  body.append('file', file, fileName)
  return formData<void>('/api/basic/v1/moment/background/upload', body)
}

export function getSetting(data: MomentSettingGetParam): Promise<ApiResponse<MomentSettingResult>> {
  return post<MomentSettingResult, MomentSettingGetParam>('/api/basic/v1/moment/setting/get', data)
}
