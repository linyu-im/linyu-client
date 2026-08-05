import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo } from '@tauri-apps/api/event'
import { Effect, EffectState, UserAttentionType } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'
import { WEBVIEW_ADDITIONAL_BROWSER_ARGS } from '@/constants/webview'
import type { InstalledPlugin, PluginWindow } from '@/types/plugin'

type WebviewWindowCreateOptions = NonNullable<ConstructorParameters<typeof WebviewWindow>[1]> & {
  additionalBrowserArgs?: string
}

const defaultOptions = {
  width: 900,
  height: 670,
  minWidth: 0,
  minHeight: 0,
  maxWidth: undefined as number | undefined,
  maxHeight: undefined as number | undefined,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
  resizable: false,
  fullscreen: false,
  visible: false,
  transparent: false,
  closeWindow: null as string | null,
  skipTaskbar: false,
  alwaysOnTop: false,
  decorations: false,
  // 关闭 Tauri 原生拖放后，HTML5 drop 才能收到 OS 文件，但拿不到本地路径（只能读 File 内容）。
  // 需要本地路径的窗口（home / 独立会话）请显式 dragDropEnabled: true，并用 listenOsFileDrop。
  dragDropEnabled: false,
  center: true,
  url: null as string | null
}

interface PersistedPluginWindowBounds {
  width: number
  height: number
  x?: number
  y?: number
}

const pluginWindowBoundsKey = (pluginId: string, windowId: string) =>
  `linyu:plugin-window-bounds:${pluginId}:${windowId}`

const readPluginWindowBounds = (pluginId: string, windowId: string): PersistedPluginWindowBounds | null => {
  try {
    const value = JSON.parse(
      localStorage.getItem(pluginWindowBoundsKey(pluginId, windowId)) || 'null'
    ) as PersistedPluginWindowBounds | null
    if (!value || !Number.isFinite(value.width) || !Number.isFinite(value.height)) return null
    if (value.x !== undefined && !Number.isFinite(value.x)) return null
    if (value.y !== undefined && !Number.isFinite(value.y)) return null
    return value
  } catch {
    return null
  }
}

export const createWebviewWindow = async (
  title: string,
  label: string,
  options: Partial<typeof defaultOptions> = {}
) => {
  const opts = { ...defaultOptions, ...options }

  let webview = await WebviewWindow.getByLabel(label)
  if (webview) {
    await webview.show()
    await webview.unminimize()
    await webview.setFocus()
    return webview
  }

  const webviewOptions: WebviewWindowCreateOptions = {
    title,
    url: opts.url ?? `/${label}`,
    fullscreen: opts.fullscreen,
    resizable: opts.resizable,
    center: opts.center,
    width: opts.width,
    height: opts.height,
    minHeight: opts.minHeight,
    minWidth: opts.minWidth,
    maxHeight: opts.maxHeight,
    maxWidth: opts.maxWidth,
    x: opts.x,
    y: opts.y,
    skipTaskbar: opts.skipTaskbar,
    alwaysOnTop: opts.alwaysOnTop,
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

export const getCurrentWindowLabel = () => WebviewWindow.getCurrent().label

export const isCurrentWindowLabel = (label: string) => getCurrentWindowLabel() === label

/** 任务栏闪烁提醒（窗口已聚焦时无效果） */
export const requestCurrentWindowAttention = async (type: UserAttentionType = UserAttentionType.Informational) => {
  const webview = WebviewWindow.getCurrent()
  const focused = await webview.isFocused()
  if (focused) return
  await webview.requestUserAttention(type)
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
    // Windows WebView2 只有在创建时可见，才会注册原生文件 DropTarget。
    // 动态窗口先 hidden 再 show 会永久显示禁止拖放（tauri#14643）。
    visible: true,
    // 网盘/消息大文件拖入必须拿本地路径（onDragDropEvent.paths）
    dragDropEnabled: true
  })

export const createEmotionWinodw = () =>
  createWebviewWindow('心情', 'emotion', { width: 320, height: 525, transparent: true })

export const createSetWinodw = async (tab?: string) => {
  const window = await createWebviewWindow('设置', 'set', {
    width: 900,
    height: 680,
    minWidth: 820,
    minHeight: 620,
    resizable: true,
    transparent: true,
    url: tab ? `/set?tab=${encodeURIComponent(tab)}` : '/set'
  })
  if (tab) await emitTo('set', 'settings:navigate', { tab })
  return window
}

export const createFeedbackWinodw = () =>
  createWebviewWindow('意见反馈', 'feedback', {
    width: 600,
    height: 640,
    minWidth: 480,
    minHeight: 520,
    resizable: true,
    transparent: true
  })

export const createPluginRuntimeWindow = async () => {
  const runtimeWindow = await WebviewWindow.getByLabel('plugin-runtime')
  if (runtimeWindow) return runtimeWindow

  return createWebviewWindow('Linyu Plugin Runtime', 'plugin-runtime', {
    url: '/pluginRuntime',
    width: 1,
    height: 1,
    visible: false,
    center: false,
    skipTaskbar: true,
    decorations: false,
    transparent: false
  })
}

const legacyPluginWindow = (plugin: InstalledPlugin): PluginWindow | null => {
  if (!plugin.manifest.ui) return null
  return {
    id: 'main',
    entry: plugin.manifest.ui,
    primary: true,
    title: plugin.name,
    decorations: {
      mode: 'linyu',
      tabs: false,
      showIcon: true,
      showVersion: false
    },
    size: {
      width: 900,
      height: 650,
      minWidth: 640,
      minHeight: 480
    },
    behavior: {
      resizable: true,
      center: true,
      singleton: true,
      persistBounds: true,
      alwaysOnTop: false,
      skipTaskbar: false,
      fullscreen: false
    }
  }
}

export const getPluginWindow = (plugin: InstalledPlugin, windowId?: string) => {
  const windows = plugin.manifest.windows || []
  return (
    windows.find((window) => window.id === windowId) ||
    (!windowId ? windows.find((window) => window.primary) : undefined) ||
    legacyPluginWindow(plugin)
  )
}

export const createPluginUiWindow = async (plugin: InstalledPlugin, windowId?: string) => {
  const declaredWindow = getPluginWindow(plugin, windowId)
  if (!declaredWindow) throw new Error('PLUGIN_UI_NOT_DECLARED')
  const persisted = declaredWindow.behavior.persistBounds ? readPluginWindowBounds(plugin.id, declaredWindow.id) : null
  const width = Math.min(
    Math.max(persisted?.width || declaredWindow.size.width, declaredWindow.size.minWidth),
    declaredWindow.size.maxWidth || 3840
  )
  const height = Math.min(
    Math.max(persisted?.height || declaredWindow.size.height, declaredWindow.size.minHeight),
    declaredWindow.size.maxHeight || 2160
  )
  await createPluginRuntimeWindow()
  let hash = 0x811c9dc5
  for (let index = 0; index < plugin.id.length; index += 1) {
    hash = Math.imul(hash ^ plugin.id.charCodeAt(index), 0x01000193)
  }
  const safeId = `${plugin.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'plugin'}-${(hash >>> 0).toString(16)}`
  const safeWindowId = declaredWindow.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'main'
  const instance = declaredWindow.behavior.singleton ? '' : `-${Date.now().toString(36)}`
  const query = new URLSearchParams({ pluginId: plugin.id, windowId: declaredWindow.id })
  return createWebviewWindow(declaredWindow.title || plugin.name, `plugin-ui-${safeId}-${safeWindowId}${instance}`, {
    url: `/plugin?${query.toString()}`,
    width,
    height,
    minWidth: declaredWindow.size.minWidth,
    minHeight: declaredWindow.size.minHeight,
    maxWidth: declaredWindow.size.maxWidth,
    maxHeight: declaredWindow.size.maxHeight,
    resizable: declaredWindow.behavior.resizable,
    fullscreen: declaredWindow.behavior.fullscreen,
    center: persisted?.x === undefined || persisted.y === undefined ? declaredWindow.behavior.center : false,
    x: persisted?.x,
    y: persisted?.y,
    alwaysOnTop: declaredWindow.behavior.alwaysOnTop,
    skipTaskbar: declaredWindow.behavior.skipTaskbar,
    decorations: declaredWindow.decorations.mode === 'native',
    visible: true,
    transparent: false
  })
}

export const trackCurrentPluginWindowBounds = async (pluginId: string, windowId: string) => {
  const webview = WebviewWindow.getCurrent()
  const saveBounds = (patch: Partial<PersistedPluginWindowBounds>) => {
    const current = readPluginWindowBounds(pluginId, windowId)
    if (!current) return
    localStorage.setItem(pluginWindowBoundsKey(pluginId, windowId), JSON.stringify({ ...current, ...patch }))
  }
  const scale = await webview.scaleFactor()
  const initialSize = (await webview.innerSize()).toLogical(scale)
  const initialPosition = (await webview.outerPosition()).toLogical(scale)
  localStorage.setItem(
    pluginWindowBoundsKey(pluginId, windowId),
    JSON.stringify({
      width: initialSize.width,
      height: initialSize.height,
      x: initialPosition.x,
      y: initialPosition.y
    } satisfies PersistedPluginWindowBounds)
  )
  const [stopResize, stopMove] = await Promise.all([
    webview.onResized((event) => {
      const size = event.payload.toLogical(scale)
      saveBounds({ width: size.width, height: size.height })
    }),
    webview.onMoved((event) => {
      const position = event.payload.toLogical(scale)
      saveBounds({ x: position.x, y: position.y })
    })
  ])
  return () => {
    stopResize()
    stopMove()
  }
}

export const resetPluginWindowBounds = (pluginId: string, windowId: string) => {
  localStorage.removeItem(pluginWindowBoundsKey(pluginId, windowId))
}

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

export interface FilePreviewWindowOptions {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export const createFilePreviewWindow = (options: FilePreviewWindowOptions) => {
  const query = new URLSearchParams({
    url: options.url,
    type: options.type,
    name: options.name,
    size: String(options.size)
  })
  const safeId = options.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'file'
  const label = `file-preview-${safeId}-${Date.now().toString(36)}`

  return createWebviewWindow(options.name, label, {
    url: `/filePreview?${query.toString()}`,
    width: 1040,
    height: 760,
    minWidth: 720,
    minHeight: 520,
    resizable: true,
    transparent: true
  })
}

export const createChatRecordWindow = () =>
  createWebviewWindow('聊天记录', 'chatRecord', {
    width: 660,
    minWidth: 660,
    height: 700,
    minHeight: 580,
    resizable: true,
    transparent: true
  })

export const createAddContactsWindow = () =>
  createWebviewWindow('添加联系人/群聊', 'addContacts', {
    width: 640,
    minWidth: 640,
    height: 680,
    minHeight: 560,
    resizable: true,
    transparent: true
  })

export const createGroupNoticeWindow = () =>
  createWebviewWindow('群公告', 'groupNotice', {
    width: 520,
    minWidth: 420,
    height: 640,
    minHeight: 480,
    resizable: true,
    transparent: true
  })

export const createMessageRemindWindow = () => openAndFocusWindow('messageRemind')

export const createCallWindow = (mode: 'video' | 'audio' = 'video') =>
  mode === 'audio'
    ? createWebviewWindow('语音通话', 'call', {
        url: '/call/audio',
        width: 350,
        height: 600,
        minWidth: 350,
        minHeight: 600,
        resizable: false,
        transparent: true
      })
    : createWebviewWindow('视频通话', 'call', {
        url: '/call/video',
        width: 1080,
        height: 720,
        minWidth: 1080,
        minHeight: 720,
        resizable: true,
        transparent: true
      })

const toChatSessionLabel = (chatId: string) => `chatSession-${chatId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

export const getChatSessionWindowLabel = (chatId: string) => toChatSessionLabel(chatId)

export const hasChatSessionWindow = async (chatId: string) => {
  const webview = await WebviewWindow.getByLabel(toChatSessionLabel(chatId))
  return !!webview
}

export const closeChatSessionWindow = async (chatId: string) => {
  await closeWebviewWindow(toChatSessionLabel(chatId))
}

export const createChatSessionWindow = (chat: { id: string; peerName?: string; peerRemark?: string }) => {
  const title = chat.peerRemark?.trim() || chat.peerName?.trim() || '聊天'
  const label = toChatSessionLabel(chat.id)
  return createWebviewWindow(title, label, {
    url: `/chatSession?chatId=${encodeURIComponent(chat.id)}`,
    width: 660,
    height: 700,
    minWidth: 520,
    minHeight: 480,
    resizable: true,
    transparent: true,
    visible: true,
    dragDropEnabled: true
  })
}

const toMomentLabel = (userId: string) => `moment-${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

export const createMomentWindow = (userId: string) =>
  createWebviewWindow('过往', toMomentLabel(userId), {
    url: `/moment?userId=${encodeURIComponent(userId)}`,
    width: 720,
    height: 800,
    minWidth: 720,
    minHeight: 600,
    resizable: true,
    transparent: true
  })
