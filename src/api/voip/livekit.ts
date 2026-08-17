import type {
  LivekitInfoResult,
  LivekitRoomUsersParam,
  LivekitRoomUsersResult,
  LivekitTokenParam,
  LivekitTokenResult
} from '@/types/api/livekit'
import { post, type ApiResponse } from '@/utils/network/http'

/** 获取 LiveKit 服务信息（是否启用 + host） */
export function getInfo(): Promise<ApiResponse<LivekitInfoResult>> {
  return post<LivekitInfoResult>('/api/voip/v1/livekit/info', {})
}

/** 获取群聊入会 LiveKit token */
export function getGroupToken(data: LivekitTokenParam): Promise<ApiResponse<LivekitTokenResult>> {
  return post<LivekitTokenResult, LivekitTokenParam>('/api/voip/v1/livekit/token/group', data)
}

/** 获取单聊入会 LiveKit token */
export function getUserToken(data: LivekitTokenParam): Promise<ApiResponse<LivekitTokenResult>> {
  return post<LivekitTokenResult, LivekitTokenParam>('/api/voip/v1/livekit/token/user', data)
}

/** 查询房间在线用户列表 */
export function listRoomUsers(data: LivekitRoomUsersParam): Promise<ApiResponse<LivekitRoomUsersResult>> {
  return post<LivekitRoomUsersResult, LivekitRoomUsersParam>('/api/voip/v1/livekit/room/users', data)
}
