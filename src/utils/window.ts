import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

const defaultOptions = {
  width: 800,
  height: 600,
  minWidth: 400,
  minHeight: 500,
  resizable: false,
  visible: true,
  transparent: false,
  closeWindow: null
}

export const createWebviewWindow = async (
  title: string,
  label: string,
  options: Partial<typeof defaultOptions> = {}
) => {
  var webview = await WebviewWindow.getByLabel(label)
  console.log(webview)
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
    center: true,
    width: options.width,
    height: options.height,
    minHeight: options.minHeight,
    minWidth: options.minWidth,
    skipTaskbar: false,
    decorations: false,
    transparent: options.transparent,
    visible: options.visible,
    dragDropEnabled: true
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
