import { useSystemSettingStore } from '@/stores/app/systemSetting'

export const DEFAULT_SERVICE_URL = 'http://api.linyu.chat'

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
 * 1. 网络设置里自定义地址
 * 2. 否则 .env 的 VITE_SERVICE_URL（本地开发与改配置前行为一致）
 * 3. 再否则官方默认 http://api.linyu.chat
 */
export function getServiceUrl(): string {
  const custom = useSystemSettingStore().network?.serviceUrl
  if (custom?.trim()) {
    return normalizeServiceUrl(custom)
  }
  const envUrl = import.meta.env.VITE_SERVICE_URL?.trim()
  if (envUrl) {
    return normalizeServiceUrl(envUrl)
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
