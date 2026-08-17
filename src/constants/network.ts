import { useSystemSettingStore } from '@/stores/app/systemSetting'

export const DEFAULT_SERVICE_URL = 'http://api.linyu.chat'
export const OFFICIAL_WEBSITE_URL = 'https://linyu.chat'
export const TERMS_OF_SERVICE_URL = 'https://linyu.chat/terms'
export const PRIVACY_POLICY_URL = 'https://linyu.chat/privacy'
export const PRICING_URL = 'https://linyu.chat/pricing'

export const WS_DEVICE = 'desktop'
export const WS_HEARTBEAT_ROUTE = 'heartbeat'
export const WS_HEARTBEAT_INTERVAL_MS = 30_000
export const WS_MAX_RECONNECT_ATTEMPTS = 10
export const WS_RECONNECT_BASE_INTERVAL_MS = 3_000

export function normalizeServiceUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function isValidServiceUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeServiceUrl(url))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 运行时 HTTP 服务根地址：
 * 1. 网络设置里已填写的自定义地址
 * 2. 未填写（空）时使用官方默认 DEFAULT_SERVICE_URL
 */
export function getServiceUrl(): string {
  const custom = useSystemSettingStore().network?.serviceUrl?.trim()
  if (custom) {
    return normalizeServiceUrl(custom)
  }
  return DEFAULT_SERVICE_URL
}

/** 由 HTTP 服务地址推导 WebSocket：http→ws，https→wss */
export function getWsUrl(): string {
  const serviceUrl = getServiceUrl()
  try {
    const parsed = new URL(serviceUrl)
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProtocol}//${parsed.host}/api/ws`
  } catch {
    return ''
  }
}
