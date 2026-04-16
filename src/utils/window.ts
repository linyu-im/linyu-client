import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Effect, EffectState } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'

const defaultOptions = {
  width: 900,
  height: 670,
  minWidth: 0,
  minHeight: 0,
  resizable: false,
  fullscreen: false,
  visible: true,
  transparent: false,
  closeWindow: null as string | null,
  skipTaskbar: false,
  decorations: false,
  dragDropEnabled: true,
  center: true
}

export const createWebviewWindow = async (
  title: string,
  label: string,
  options: Partial<typeof defaultOptions> = {}
) => {
  const opts = { ...defaultOptions, ...options }

  let webview = await WebviewWindow.getByLabel(label)
  if (webview) {
    await webview.setFocus()
    await webview.show()
    return webview
  }

  webview = new WebviewWindow(label, {
    title,
    url: `/${label}`,
    fullscreen: opts.fullscreen,
    resizable: opts.resizable,
    center: opts.center,
    width: opts.width,
    height: opts.height,
    minHeight: opts.minHeight,
    minWidth: opts.minWidth,
    skipTaskbar: opts.skipTaskbar,
    decorations: opts.decorations,
    transparent: opts.transparent,
    visible: opts.visible,
    dragDropEnabled: opts.dragDropEnabled,
    windowEffects: {
      effects: [Effect.Acrylic],
      state: EffectState.Active
    }
  })

  webview.once('tauri://created', async () => {
    if (opts.closeWindow) {
      const win = await WebviewWindow.getByLabel(opts.closeWindow)
      await win?.close()
    }
  })

  webview.once('tauri://error', (e) => {
    console.error('创建窗口失败:', e)
  })

  return webview
}

export const closeCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  await webview.close()
}

export const minimizeCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  await webview.minimize()
}

export const hideCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  await webview.hide()
}

export const restoreOrMaximizeCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  const isMaximized = await webview.isMaximized()
  if (isMaximized) {
    await webview.unmaximize()
  } else {
    await webview.maximize()
  }
  return isMaximized
}

export const exitApp = async () => {
  await exit()
}

export const createHomeWinodw = () =>
  createWebviewWindow('林语', 'home', {
    width: 900,
    height: 675,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    transparent: true
  })

export const createEmotionWinodw = () =>
  createWebviewWindow('心情', 'emotion', { width: 320, height: 525, transparent: true })
