import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Effect, EffectState } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'

const defaultOptions = {
  width: 800,
  height: 600,
  minWidth: 400,
  minHeight: 500,
  resizable: false,
  visible: true,
  transparent: false,
  closeWindow: null,
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
  var webview = await WebviewWindow.getByLabel(label)
  if (webview) {
    await webview.setFocus()
    await webview.show()
    return webview
  }

  webview = new WebviewWindow(label, {
    title,
    url: `/${label}`,
    fullscreen: false,
    resizable: options.resizable,
    center: options.center,
    width: options.width,
    height: options.height,
    minHeight: options.minHeight,
    minWidth: options.minWidth,
    skipTaskbar: options.skipTaskbar,
    decorations: options.decorations,
    transparent: options.transparent,
    visible: options.visible,
    dragDropEnabled: options.dragDropEnabled,
    windowEffects: {
      effects: [Effect.Acrylic],
      state: EffectState.Active
    }
  })

  webview.once('tauri://created', async () => {
    if (options.closeWindow) {
      const win = await WebviewWindow.getByLabel(options.closeWindow)
      win?.close()
    }
  })

  webview.once('tauri://error', async (e) => {
    console.log(e)
  })

  return webview
}

export const closeCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  webview.close()
}

export const minimizeCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  webview.minimize()
}

export const exitApp = async () => {
  exit()
}
