import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'

/** 读取系统当前是否已注册开机自启 */
export const readAutostartEnabled = () => isEnabled()

/** 将开机自启状态同步到系统 */
export const syncAutostart = (enabled: boolean) => {
  if (enabled) return enable()
  return disable()
}
