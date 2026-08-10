import { getVersion } from '@tauri-apps/api/app'
import { platform } from '@tauri-apps/plugin-os'
import { check as checkAppVersionApi } from '@/api/appVersion'
import type { AppVersionCheckResult } from '@/types/api/appVersion'

export type AppPlatform = 'windows' | 'macos'

export interface AppVersionCheckInfo {
  data: AppVersionCheckResult
  localCode: number
  needForce: boolean
  needUpdate: boolean
}

export function getAppVersionCode(): number {
  return typeof __APP_VERSION_CODE__ === 'number' ? __APP_VERSION_CODE__ : 101
}

/** 优先取运行时安装版本，失败则回退到构建注入的 package.json.version */
export function getAppVersion(): Promise<string> {
  return getVersion()
    .then((version) => version || __APP_VERSION__)
    .catch(() => (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''))
}

export function getAppPlatform(): Promise<AppPlatform> {
  try {
    const value = platform()
    if (value === 'windows' || value === 'macos') {
      return Promise.resolve(value)
    }
    return Promise.reject(new Error(`Unsupported platform: ${value}`))
  } catch (error) {
    return Promise.reject(error)
  }
}

function toVersionCode(value: unknown): number {
  const code = Number(value)
  return Number.isFinite(code) ? code : 0
}

export function checkAppVersion(): Promise<AppVersionCheckInfo> {
  return getAppPlatform().then((appPlatform) => {
    return checkAppVersionApi({ platform: appPlatform }).then((res) => {
      if (res.code === 0 && res.data) {
        const localCode = getAppVersionCode()
        const minSupportVersionCode = toVersionCode(res.data.minSupportVersionCode)
        const latestVersionCode = toVersionCode(res.data.latestVersionCode)
        const data: AppVersionCheckResult = {
          ...res.data,
          minSupportVersionCode,
          latestVersionCode
        }
        return {
          data,
          localCode,
          needForce: localCode < minSupportVersionCode,
          needUpdate: localCode < latestVersionCode
        }
      }
      return Promise.reject(new Error(res.msg || 'check version failed'))
    })
  })
}
