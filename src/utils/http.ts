import { fetch } from '@tauri-apps/plugin-http'
import { useUserStore } from '@/stores/user'
import { useSystemSettingStore } from '@/stores/systemSetting'
import i18n from '@/services/i18n'
const SERVICE_URL: string = import.meta.env.VITE_SERVICE_URL

const t = i18n.global.t

export interface RequestConfig<T = any> {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: T
  headers?: Record<string, string>
}

export interface ApiResponse<T = any> {
  code: number
  msg: string
  data?: T
}

function getToken(): string {
  const userStore = useUserStore()
  return userStore.authInfo.token || ''
}

function getLang(): string {
  const systemSetting = useSystemSettingStore()
  return systemSetting.preferences.lang || 'zh'
}

async function send<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, headers = {} } = config

  try {
    const response = await fetch(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept-Language': getLang(),
        Authorization: getToken(),
        ...headers
      }
    })

    if (!response.ok) {
      return {
        code: response.status,
        msg: t('http.networkError')
      }
    }

    const result: ApiResponse<T> = await response.json()

    return result
  } catch (_error: any) {
    return {
      code: 1,
      msg: t('http.networkError')
    }
  }
}

function buildUrl(url: string, params?: Record<string, any>): string {
  const query = new URLSearchParams({
    ...(params || {}),
    _t: Date.now().toString()
  }).toString()

  return `${SERVICE_URL}${url}${query ? `?${query}` : ''}`
}

function resolveResourceUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${SERVICE_URL}${path}`
}

const getServiceOrigin = () => {
  try {
    return new URL(SERVICE_URL).origin
  } catch {
    return ''
  }
}

const isApiOriginUrl = (requestUrl: string) => {
  const serviceOrigin = getServiceOrigin()
  if (!serviceOrigin) return false
  try {
    return new URL(requestUrl).origin === serviceOrigin
  } catch {
    return false
  }
}

const buildBinaryFetchHeaders = (requestUrl: string): Record<string, string> => {
  if (isApiOriginUrl(requestUrl)) {
    return {
      'Accept-Language': getLang(),
      Authorization: getToken()
    }
  }

  const headers: Record<string, string> = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
  }

  try {
    const parsed = new URL(requestUrl)
    headers.Referer = `${parsed.origin}/`
    headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  } catch {
    // ignore invalid url
  }

  return headers
}

const fetchBinaryViaNative = async (requestUrl: string, onProgress?: (progress: number) => void) => {
  const response = await globalThis.fetch(requestUrl, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer-when-downgrade'
  })
  if (!response.ok) {
    throw new Error(t('http.networkError'))
  }
  const buffer = await response.arrayBuffer()
  onProgress?.(100)
  return buffer
}

const formatErrorDetail = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  return { value: String(error) }
}

export async function fetchBinary(url: string, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  const requestUrl = resolveResourceUrl(url)
  const withAuth = isApiOriginUrl(requestUrl)
  onProgress?.(0)

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: buildBinaryFetchHeaders(requestUrl)
    })

    if (!response.ok) {
      throw new Error(t('http.networkError'))
    }

    const buffer = await response.arrayBuffer()
    onProgress?.(100)
    return buffer
  } catch (error) {
    if (!isApiOriginUrl(requestUrl)) {
      try {
        const buffer = await fetchBinaryViaNative(requestUrl, onProgress)
        return buffer
      } catch (fallbackError) {
        console.error('[message-file] fetchBinary native fallback failed', {
          fileUrl: url,
          requestUrl,
          error: formatErrorDetail(fallbackError)
        })
      }
    }
    console.error('[message-file] fetchBinary failed', {
      fileUrl: url,
      requestUrl,
      withAuth,
      error: formatErrorDetail(error)
    })
    throw error
  }
}

export function get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  return send<T>({
    url: buildUrl(url, params),
    method: 'GET'
  })
}

export function post<T = any, D = any>(url: string, data?: D): Promise<ApiResponse<T>> {
  return send<T>({
    url: buildUrl(url),
    method: 'POST',
    data
  })
}

export async function formData<T = any>(
  url: string,
  data: FormData,
  headers?: Record<string, string>
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(buildUrl(url), {
      method: 'POST',
      body: data,
      headers: {
        'Accept-Language': getLang(),
        Authorization: getToken(),
        ...headers
      }
    })

    if (!response.ok) {
      return {
        code: response.status,
        msg: t('http.networkError')
      }
    }
    return (await response.json()) as ApiResponse<T>
  } catch (_error: unknown) {
    return { code: 1, msg: t('http.networkError') }
  }
}

export type SseEventHandler = (event: string, data: string) => void

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split('\n')
  let event = 'message'
  let dataStart = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:') && dataStart === -1) {
      dataStart = i
    }
  }

  if (dataStart === -1) return null

  const firstDataLine = lines[dataStart].slice(5).trimStart()
  const restLines = lines.slice(dataStart + 1)
  const data = [firstDataLine, ...restLines].join('\n').trim()

  return { event, data }
}

function consumeSseBuffer(buffer: string, onEvent: SseEventHandler): string {
  const parts = buffer.split('\n\n')
  const remainder = parts.pop() ?? ''

  for (const part of parts) {
    if (!part.trim()) continue
    const parsed = parseSseBlock(part)
    if (parsed) onEvent(parsed.event, parsed.data)
  }

  return remainder
}

export async function postSse(
  url: string,
  data: unknown,
  onEvent: SseEventHandler,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(buildUrl(url), {
    method: 'POST',
    body: JSON.stringify(data),
    signal,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'text/event-stream',
      'Accept-Language': getLang(),
      Authorization: getToken()
    }
  })

  if (!response.ok) {
    throw new Error(t('http.networkError'))
  }

  const body = response.body
  if (!body) {
    throw new Error(t('http.responseBodyEmpty'))
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    buffer = consumeSseBuffer(buffer, onEvent)
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    consumeSseBuffer(`${buffer}\n\n`, onEvent)
  }
}

export default { get, post, formData, postSse, fetchBinary }
