import { fetch } from '@tauri-apps/plugin-http'
import { useUserStore } from '@/stores/user'
const SERVICE_URL: string = import.meta.env.VITE_SERVICE_URL

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
  return userStore.userInfo.token || ''
}

async function send<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, headers = {} } = config

  try {
    const response = await fetch(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: getToken(),
        ...headers
      }
    })

    if (!response.ok) {
      return {
        code: response.status,
        msg: `HTTP Error: ${response.status}`
      }
    }

    const result: ApiResponse<T> = await response.json()

    return result
  } catch (error: any) {
    return {
      code: 1,
      msg: `Network Error: ${error?.message || error}`
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

export default { get, post }
