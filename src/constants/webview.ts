// Windows WebView2：跳过 getUserMedia 时 WebView 内的麦克风/摄像头授权弹窗。
// 覆盖 additionalBrowserArgs 时需保留 wry 默认参数，见 tauri-utils WindowConfig 文档。
export const WEBVIEW_ADDITIONAL_BROWSER_ARGS =
  '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --use-fake-ui-for-media-stream'
