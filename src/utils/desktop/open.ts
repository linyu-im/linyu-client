import { open } from '@tauri-apps/plugin-shell'

export const openUrl = async (url: string) => {
  try {
    await open(url)
  } catch {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noreferrer')
    }
  }
}
