import type {
  MomentComment,
  MomentCommentAddParam,
  MomentCommentDelParam,
  MomentLike,
  MomentLikeParam,
  MomentPageParam,
  MomentPageResult
} from '@/types/api/moment'
import { ApiResponse, post } from '@/utils/http'

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
