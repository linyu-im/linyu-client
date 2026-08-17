import { livekitApi } from '@/api'
import type { AvCallType } from '@/types/api/avCall'
import type { LivekitInfoResult } from '@/types/api/livekit'

export interface LivekitCredentials {
  host: string
  token: string
}

export type CallWindowJoinPayload = {
  sessionId: string
  sceneType: 'user' | 'group'
  /** 原始邀请类型（用于通话记录，群聊开 video 窗时仍可保留 audio） */
  callType: AvCallType
  peerId: string
  displayName: string
  /** 聊天会话 id（发 call_record 用，非 VoIP sessionId） */
  chatSessionId?: string
  /** 群聊已邀请、尚未入会的成员（用于侧栏占位） */
  inviteUserIds?: string[]
}

export type CallRemoteHangupPayload = {
  sessionId: string
}

export type CallRoomChangePayload = {
  sessionId: string
}

/** 将 LiveKit / 媒体设备错误归类，便于展示用户可读提示 */
export type LivekitErrorKind = 'deviceInUse' | 'permissionDenied' | 'deviceNotFound' | 'connectFailed'

export const isLivekitDisabledError = (error: unknown) => {
  return error instanceof Error && error.message === 'LIVEKIT_DISABLED'
}

export const classifyLivekitError = (error: unknown): LivekitErrorKind => {
  const msg =
    error instanceof Error ? `${error.name} ${error.message}` : typeof error === 'string' ? error : String(error ?? '')

  if (/NotAllowedError|Permission denied|PermissionDenied|permission/i.test(msg)) {
    return 'permissionDenied'
  }
  if (/NotFoundError|Requested device not found|DevicesNotFound|no.*device/i.test(msg)) {
    return 'deviceNotFound'
  }
  if (
    /device in use|NotReadableError|Could not start video source|Could not start audio source|TrackUnpublishError|AbortError/i.test(
      msg
    )
  ) {
    return 'deviceInUse'
  }
  return 'connectFailed'
}

export const livekitErrorI18nKey = (error: unknown) => {
  if (isLivekitDisabledError(error)) return 'audioVideoCall.disabled' as const
  return `audioVideoCall.errors.${classifyLivekitError(error)}` as const
}

const pickStringField = (raw: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const extractRawString = (raw: unknown, keys: string[]) => {
  if (typeof raw === 'string') return raw.trim()
  if (raw && typeof raw === 'object') {
    return pickStringField(raw as Record<string, unknown>, keys)
  }
  return ''
}

/** 将后端 host 规范为 LiveKit Room.connect 可用的 ws(s) URL */
export const normalizeLivekitUrl = (raw: unknown): string => {
  const value = extractRawString(raw, ['url', 'host', 'wsUrl', 'wssUrl'])
  if (!value) {
    throw new Error('LIVEKIT_HOST_EMPTY')
  }
  if (/^wss?:\/\//i.test(value)) return value
  if (/^https:\/\//i.test(value)) return value.replace(/^https/i, 'wss')
  if (/^http:\/\//i.test(value)) return value.replace(/^http/i, 'ws')

  const hostOnly = value.replace(/^\/\//, '')
  const isLocal = /^(localhost|127\.|192\.168\.|10\.|\[::1\])/i.test(hostOnly)
  return `${isLocal ? 'ws' : 'wss'}://${hostOnly}`
}

const normalizeLivekitToken = (raw: unknown): string => {
  const value = extractRawString(raw, ['token', 'accessToken', 'jwt'])
  if (!value) {
    throw new Error('LIVEKIT_TOKEN_EMPTY')
  }
  return value
}

export const prepareLivekitCredentials = (
  sessionId: string,
  sceneType: 'user' | 'group'
): Promise<LivekitCredentials> => {
  return ensureLivekitEnabled().then((info) => {
    let host: string
    try {
      host = normalizeLivekitUrl(info.host)
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('LIVEKIT_HOST_INVALID'))
    }

    const tokenReq =
      sceneType === 'group' ? livekitApi.getGroupToken({ sessionId }) : livekitApi.getUserToken({ sessionId })
    return tokenReq.then((tokenRes) => {
      if (tokenRes.code !== 0 || tokenRes.data == null || tokenRes.data === '') {
        return Promise.reject(new Error(tokenRes.msg || 'LIVEKIT_TOKEN_FAILED'))
      }
      try {
        return { host, token: normalizeLivekitToken(tokenRes.data) }
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error('LIVEKIT_TOKEN_INVALID'))
      }
    })
  })
}

/** 校验 LiveKit 已启用并返回 info；未启用时 reject LIVEKIT_DISABLED */
export const ensureLivekitEnabled = (): Promise<LivekitInfoResult> => {
  return livekitApi.getInfo().then((res) => {
    if (res.code !== 0 || !res.data) {
      return Promise.reject(new Error(res.msg || 'LIVEKIT_INFO_FAILED'))
    }
    if (!res.data.enabled) {
      return Promise.reject(new Error('LIVEKIT_DISABLED'))
    }
    if (!res.data.host?.trim()) {
      return Promise.reject(new Error('LIVEKIT_HOST_EMPTY'))
    }
    return res.data
  })
}
