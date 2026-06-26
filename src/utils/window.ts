import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { Effect, EffectState } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'
import { WEBVIEW_ADDITIONAL_BROWSER_ARGS } from '@/constants/webview'

type WebviewWindowCreateOptions = NonNullable<ConstructorParameters<typeof WebviewWindow>[1]> & {
  additionalBrowserArgs?: string
}

const defaultOptions = {
  width: 900,
  height: 670,
  minWidth: 0,
  minHeight: 0,
  resizable: false,
  fullscreen: false,
  visible: false,
  transparent: false,
  closeWindow: null as string | null,
  skipTaskbar: false,
  decorations: false,
  // 关闭 Tauri 原生拖拽处理，否则系统层会拦截 OS 级 file drop，WebView 里的 HTML5
  // dragover / drop 事件根本收不到，富文本编辑器拖入图片 / 文件就没反应。
  dragDropEnabled: false,
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

  const webviewOptions: WebviewWindowCreateOptions = {
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
    },
    additionalBrowserArgs: WEBVIEW_ADDITIONAL_BROWSER_ARGS
  }

  webview = new WebviewWindow(label, webviewOptions)

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

export const closeWebviewWindow = async (label: string) => {
  const webview = await WebviewWindow.getByLabel(label)
  await webview?.close()
}

export const ShowCurrentWindow = async () => {
  const webview = WebviewWindow.getCurrent()
  await webview.show()
}

export const openAndFocusWindow = async (label: string) => {
  const webview = await WebviewWindow.getByLabel(label)
  if (webview) {
    await webview.show()
    await webview.setFocus()
  }
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
    width: 960,
    height: 675,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    transparent: true,
    dragDropEnabled: true
  })

export const createEmotionWinodw = () =>
  createWebviewWindow('心情', 'emotion', { width: 320, height: 525, transparent: true })

export const createSetWinodw = () => createWebviewWindow('设置', 'set', { width: 800, height: 600, transparent: true })

export const createFeedbackWinodw = () =>
  createWebviewWindow('意见反馈', 'feedback', {
    width: 600,
    height: 640,
    minWidth: 480,
    minHeight: 520,
    resizable: true,
    transparent: true
  })

export const createImgViewerWindow = () =>
  createWebviewWindow('图片', 'imgViewer', {
    width: 900,
    height: 640,
    minWidth: 640,
    minHeight: 480,
    resizable: true,
    transparent: true
  })

export const createVideoViewerWindow = () =>
  createWebviewWindow('视频', 'videoViewer', {
    width: 900,
    height: 640,
    minWidth: 640,
    minHeight: 480,
    resizable: true,
    transparent: true
  })
