import type {
  AvCallGroupHangupParam,
  AvCallGroupInviteParam,
  AvCallInviteResult,
  AvCallUserHangupParam,
  AvCallUserInviteParam
} from '@/types/api/avCall'
import { post, type ApiResponse } from '@/utils/network/http'

/** 发起好友通话邀请 */
export function inviteUser(data: AvCallUserInviteParam): Promise<ApiResponse<AvCallInviteResult>> {
  return post<AvCallInviteResult, AvCallUserInviteParam>('/api/voip/v1/av-call/user/invite', data)
}

/** 好友通话挂断 */
export function hangupUser(data: AvCallUserHangupParam): Promise<ApiResponse<void>> {
  return post<void, AvCallUserHangupParam>('/api/voip/v1/av-call/user/hangup', data)
}

/** 发起群聊通话邀请 */
export function inviteGroup(data: AvCallGroupInviteParam): Promise<ApiResponse<AvCallInviteResult>> {
  return post<AvCallInviteResult, AvCallGroupInviteParam>('/api/voip/v1/av-call/group/invite', data)
}

/** 群聊通话挂断 */
export function hangupGroup(data: AvCallGroupHangupParam): Promise<ApiResponse<void>> {
  return post<void, AvCallGroupHangupParam>('/api/voip/v1/av-call/group/hangup', data)
}
