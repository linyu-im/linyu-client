import { getVersion } from '@tauri-apps/api/app'
import { watch } from 'vue'
import { PLUGIN_APPEARANCE_EVENT } from '@/constants/event'
import { ThemePatternEnum } from '@/constants/system'
import * as pluginApiService from '@/services/pluginApiService'
import { useSystemSettingStore } from '@/stores/app/systemSetting'
import { useUserStore } from '@/stores/user/user'

export { PLUGIN_APPEARANCE_EVENT }

export interface PluginCurrentUser {
  avatar: string
  phone: string | null
  email: string | null
  gender: string
  account: string
  id: string
  username: string
}

export interface PluginAppearance {
  language: string
  theme: ThemePatternEnum
  resolvedTheme: ThemePatternEnum.LIGHT | ThemePatternEnum.DARK
  scheme: string
}

export function getPluginAppearance(): PluginAppearance {
  const systemSetting = useSystemSettingStore()
  const theme = systemSetting.themes.pattern
  const resolvedTheme =
    theme === ThemePatternEnum.OS
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? ThemePatternEnum.DARK
        : ThemePatternEnum.LIGHT
      : theme
  return {
    language: systemSetting.preferences.lang,
    theme,
    resolvedTheme,
    scheme: systemSetting.themes.scheme
  }
}

export function executePluginContextApi(pluginId: string, method: string): Promise<unknown> | undefined {
  const systemSetting = useSystemSettingStore()
  if (method === 'system.getAppearance') return Promise.resolve(getPluginAppearance())
  if (method === 'system.getLocale') return Promise.resolve(systemSetting.preferences.lang)
  if (method === 'system.getPlatform') {
    const value = navigator.platform.toLowerCase()
    return Promise.resolve(value.includes('win') ? 'windows' : value.includes('mac') ? 'macos' : 'linux')
  }
  if (method === 'app.getVersion') return getVersion()
  if (method !== 'user.getCurrent') return undefined

  const userStore = useUserStore()
  const userId = userStore.userInfo.id || userStore.authInfo.userId
  return pluginApiService
    .invokePluginApi(pluginId, userId, 'permissions.check', { name: 'user.profile.read' })
    .then(() => {
      const user = userStore.userInfo
      const result: PluginCurrentUser = {
        avatar: user.avatar,
        phone: user.phone,
        email: user.email,
        gender: user.gender,
        account: user.account,
        id: user.id || userStore.authInfo.userId,
        username: user.username
      }
      return result
    })
}

export function subscribePluginAppearance(listener: (appearance: PluginAppearance) => void) {
  const systemSetting = useSystemSettingStore()
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const notify = () => listener(getPluginAppearance())
  const stopWatch = watch(
    () => [systemSetting.preferences.lang, systemSetting.themes.pattern, systemSetting.themes.scheme],
    notify
  )
  const onSystemThemeChange = () => {
    if (systemSetting.themes.pattern === ThemePatternEnum.OS) notify()
  }
  media.addEventListener('change', onSystemThemeChange)
  return () => {
    stopWatch()
    media.removeEventListener('change', onSystemThemeChange)
  }
}
