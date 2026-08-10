import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo } from '@tauri-apps/api/event'
import {
  Effect,
  EffectState,
  LogicalSize,
  PhysicalPosition,
  UserAttentionType,
  currentMonitor,
  primaryMonitor
} from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'
import {
  CALL_JOIN_EVENT,
  CALL_INVITE_HANGUP_EVENT,
  CALL_INVITE_UPDATE_EVENT,
  SETTINGS_NAVIGATE_EVENT
} from '@/constants/event'
import { pluginWindowBoundsKey } from '@/constants/storage'
import { WEBVIEW_ADDITIONAL_BROWSER_ARGS } from '@/constants/webview'
import {
  ADD_CONTACTS_WINDOW_HEIGHT,
  ADD_CONTACTS_WINDOW_LABEL,
  ADD_CONTACTS_WINDOW_MIN_HEIGHT,
  ADD_CONTACTS_WINDOW_MIN_WIDTH,
  ADD_CONTACTS_WINDOW_WIDTH,
  CALL_AUDIO_WINDOW_HEIGHT,
  CALL_AUDIO_WINDOW_URL,
  CALL_AUDIO_WINDOW_WIDTH,
  CALL_INVITE_WINDOW_HEIGHT,
  CALL_INVITE_WINDOW_LABEL,
  CALL_INVITE_WINDOW_MARGIN,
  CALL_INVITE_WINDOW_URL,
  CALL_INVITE_WINDOW_WIDTH,
  CALL_VIDEO_WINDOW_HEIGHT,
  CALL_VIDEO_WINDOW_URL,
  CALL_VIDEO_WINDOW_WIDTH,
  CALL_WINDOW_LABEL,
  CHAT_RECORD_WINDOW_HEIGHT,
  CHAT_RECORD_WINDOW_LABEL,
  CHAT_RECORD_WINDOW_MIN_HEIGHT,
  CHAT_RECORD_WINDOW_MIN_WIDTH,
  CHAT_RECORD_WINDOW_WIDTH,
  SEARCH_CHAT_RECORD_WINDOW_HEIGHT,
  SEARCH_CHAT_RECORD_WINDOW_LABEL,
  SEARCH_CHAT_RECORD_WINDOW_MIN_HEIGHT,
  SEARCH_CHAT_RECORD_WINDOW_MIN_WIDTH,
  SEARCH_CHAT_RECORD_WINDOW_WIDTH,
  CHAT_SESSION_WINDOW_HEIGHT,
  CHAT_SESSION_WINDOW_LABEL_PREFIX,
  CHAT_SESSION_WINDOW_MIN_HEIGHT,
  CHAT_SESSION_WINDOW_MIN_WIDTH,
  CHAT_SESSION_WINDOW_URL,
  CHAT_SESSION_WINDOW_WIDTH,
  EMOTION_WINDOW_HEIGHT,
  EMOTION_WINDOW_LABEL,
  EMOTION_WINDOW_WIDTH,
  FEEDBACK_WINDOW_HEIGHT,
  FEEDBACK_WINDOW_LABEL,
  FEEDBACK_WINDOW_MIN_HEIGHT,
  FEEDBACK_WINDOW_MIN_WIDTH,
  FEEDBACK_WINDOW_WIDTH,
  FILE_PREVIEW_WINDOW_HEIGHT,
  FILE_PREVIEW_WINDOW_LABEL_PREFIX,
  FILE_PREVIEW_WINDOW_MIN_HEIGHT,
  FILE_PREVIEW_WINDOW_MIN_WIDTH,
  FILE_PREVIEW_WINDOW_URL,
  FILE_PREVIEW_WINDOW_WIDTH,
  GROUP_NOTICE_WINDOW_HEIGHT,
  GROUP_NOTICE_WINDOW_LABEL,
  GROUP_NOTICE_WINDOW_MIN_HEIGHT,
  GROUP_NOTICE_WINDOW_MIN_WIDTH,
  GROUP_NOTICE_WINDOW_WIDTH,
  HOME_WINDOW_HEIGHT,
  HOME_WINDOW_LABEL,
  HOME_WINDOW_MIN_HEIGHT,
  HOME_WINDOW_MIN_WIDTH,
  HOME_WINDOW_WIDTH,
  IMG_VIEWER_WINDOW_HEIGHT,
  IMG_VIEWER_WINDOW_LABEL,
  IMG_VIEWER_WINDOW_MIN_HEIGHT,
  IMG_VIEWER_WINDOW_MIN_WIDTH,
  IMG_VIEWER_WINDOW_WIDTH,
  MESSAGE_REMIND_WINDOW_LABEL,
  MOMENT_WINDOW_HEIGHT,
  MOMENT_WINDOW_LABEL_PREFIX,
  MOMENT_WINDOW_MIN_HEIGHT,
  MOMENT_WINDOW_MIN_WIDTH,
  MOMENT_WINDOW_URL,
  MOMENT_WINDOW_WIDTH,
  PLUGIN_RUNTIME_WINDOW_HEIGHT,
  PLUGIN_RUNTIME_WINDOW_LABEL,
  PLUGIN_RUNTIME_WINDOW_URL,
  PLUGIN_RUNTIME_WINDOW_WIDTH,
  PLUGIN_UI_WINDOW_LABEL_PREFIX,
  PLUGIN_UI_WINDOW_URL,
  SET_WINDOW_HEIGHT,
  SET_WINDOW_LABEL,
  SET_WINDOW_MIN_HEIGHT,
  SET_WINDOW_MIN_WIDTH,
  SET_WINDOW_WIDTH,
  VIDEO_VIEWER_WINDOW_HEIGHT,
  VIDEO_VIEWER_WINDOW_LABEL,
  VIDEO_VIEWER_WINDOW_MIN_HEIGHT,
  VIDEO_VIEWER_WINDOW_MIN_WIDTH,
  VIDEO_VIEWER_WINDOW_WIDTH
} from '@/constants/window'
import type { CallInviteWindowPayload } from '@/types/api/avCall'
import type { InstalledPlugin, PluginWindow } from '@/types/plugin'

const syncCallInviteWindowSize = (webview: WebviewWindow) =>
  webview.setSize(new LogicalSize(CALL_INVITE_WINDOW_WIDTH, CALL_INVITE_WINDOW_HEIGHT))

const placeWindowBottomRight = async (webview: WebviewWindow, margin = CALL_INVITE_WINDOW_MARGIN) => {
  const monitor = (await currentMonitor()) ?? (await primaryMonitor())
  if (!monitor) return
  const [outerSize, scaleFactor] = await Promise.all([webview.outerSize(), webview.scaleFactor()])
  const marginPx = Math.round(margin * scaleFactor)
  const x = monitor.workArea.position.x + monitor.workArea.size.width - outerSize.width - marginPx
  const y = monitor.workArea.position.y + monitor.workArea.size.height - outerSize.height - marginPx
  await webview.setPosition(new PhysicalPosition(Math.max(0, Math.round(x)), Math.max(0, Math.round(y))))
}

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
  createWebviewWindow('林语', HOME_WINDOW_LABEL, {
    width: HOME_WINDOW_WIDTH,
    height: HOME_WINDOW_HEIGHT,
    minWidth: HOME_WINDOW_MIN_WIDTH,
    minHeight: HOME_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true,
    // Windows WebView2 只有在创建时可见，才会注册原生文件 DropTarget。
    // 动态窗口先 hidden 再 show 会永久显示禁止拖放（tauri#14643）。
    visible: true,
    // 网盘/消息大文件拖入必须拿本地路径（onDragDropEvent.paths）
    dragDropEnabled: true
  })

export const createEmotionWinodw = () =>
  createWebviewWindow('心情', EMOTION_WINDOW_LABEL, {
    width: EMOTION_WINDOW_WIDTH,
    height: EMOTION_WINDOW_HEIGHT,
    transparent: true
  })

export const createSetWinodw = async (tab?: string) => {
  const window = await createWebviewWindow('设置', SET_WINDOW_LABEL, {
    width: SET_WINDOW_WIDTH,
    height: SET_WINDOW_HEIGHT,
    minWidth: SET_WINDOW_MIN_WIDTH,
    minHeight: SET_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true,
    url: tab ? `/set?tab=${encodeURIComponent(tab)}` : '/set'
  })
  if (tab) await emitTo(SET_WINDOW_LABEL, SETTINGS_NAVIGATE_EVENT, { tab })
  return window
}

export const createFeedbackWinodw = () =>
  createWebviewWindow('意见反馈', FEEDBACK_WINDOW_LABEL, {
    width: FEEDBACK_WINDOW_WIDTH,
    height: FEEDBACK_WINDOW_HEIGHT,
    minWidth: FEEDBACK_WINDOW_MIN_WIDTH,
    minHeight: FEEDBACK_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })

export const createPluginRuntimeWindow = async () => {
  const runtimeWindow = await WebviewWindow.getByLabel(PLUGIN_RUNTIME_WINDOW_LABEL)
  if (runtimeWindow) return runtimeWindow

  return createWebviewWindow('Linyu Plugin Runtime', PLUGIN_RUNTIME_WINDOW_LABEL, {
    url: PLUGIN_RUNTIME_WINDOW_URL,
    width: PLUGIN_RUNTIME_WINDOW_WIDTH,
    height: PLUGIN_RUNTIME_WINDOW_HEIGHT,
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
  return createWebviewWindow(
    declaredWindow.title || plugin.name,
    `${PLUGIN_UI_WINDOW_LABEL_PREFIX}-${safeId}-${safeWindowId}${instance}`,
    {
      url: `${PLUGIN_UI_WINDOW_URL}?${query.toString()}`,
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
    }
  )
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
  createWebviewWindow('图片', IMG_VIEWER_WINDOW_LABEL, {
    width: IMG_VIEWER_WINDOW_WIDTH,
    height: IMG_VIEWER_WINDOW_HEIGHT,
    minWidth: IMG_VIEWER_WINDOW_MIN_WIDTH,
    minHeight: IMG_VIEWER_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })

export const createVideoViewerWindow = () =>
  createWebviewWindow('视频', VIDEO_VIEWER_WINDOW_LABEL, {
    width: VIDEO_VIEWER_WINDOW_WIDTH,
    height: VIDEO_VIEWER_WINDOW_HEIGHT,
    minWidth: VIDEO_VIEWER_WINDOW_MIN_WIDTH,
    minHeight: VIDEO_VIEWER_WINDOW_MIN_HEIGHT,
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
  const label = `${FILE_PREVIEW_WINDOW_LABEL_PREFIX}-${safeId}-${Date.now().toString(36)}`

  return createWebviewWindow(options.name, label, {
    url: `${FILE_PREVIEW_WINDOW_URL}?${query.toString()}`,
    width: FILE_PREVIEW_WINDOW_WIDTH,
    height: FILE_PREVIEW_WINDOW_HEIGHT,
    minWidth: FILE_PREVIEW_WINDOW_MIN_WIDTH,
    minHeight: FILE_PREVIEW_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })
}

export const createChatRecordWindow = () =>
  createWebviewWindow('聊天记录', CHAT_RECORD_WINDOW_LABEL, {
    width: CHAT_RECORD_WINDOW_WIDTH,
    minWidth: CHAT_RECORD_WINDOW_MIN_WIDTH,
    height: CHAT_RECORD_WINDOW_HEIGHT,
    minHeight: CHAT_RECORD_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })

export const createSearchChatRecordWindow = () =>
  createWebviewWindow('搜索聊天记录', SEARCH_CHAT_RECORD_WINDOW_LABEL, {
    width: SEARCH_CHAT_RECORD_WINDOW_WIDTH,
    minWidth: SEARCH_CHAT_RECORD_WINDOW_MIN_WIDTH,
    height: SEARCH_CHAT_RECORD_WINDOW_HEIGHT,
    minHeight: SEARCH_CHAT_RECORD_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })

export const createAddContactsWindow = () =>
  createWebviewWindow('添加联系人/群聊', ADD_CONTACTS_WINDOW_LABEL, {
    width: ADD_CONTACTS_WINDOW_WIDTH,
    minWidth: ADD_CONTACTS_WINDOW_MIN_WIDTH,
    height: ADD_CONTACTS_WINDOW_HEIGHT,
    minHeight: ADD_CONTACTS_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })

export const createGroupNoticeWindow = () =>
  createWebviewWindow('群公告', GROUP_NOTICE_WINDOW_LABEL, {
    width: GROUP_NOTICE_WINDOW_WIDTH,
    minWidth: GROUP_NOTICE_WINDOW_MIN_WIDTH,
    height: GROUP_NOTICE_WINDOW_HEIGHT,
    minHeight: GROUP_NOTICE_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })

export const createMessageRemindWindow = () => openAndFocusWindow(MESSAGE_REMIND_WINDOW_LABEL)

export const isCallWindowOpen = async (): Promise<boolean> => {
  const existing = await WebviewWindow.getByLabel(CALL_WINDOW_LABEL)
  return !!existing
}

export const focusCallWindow = async (): Promise<boolean> => {
  const existing = await WebviewWindow.getByLabel(CALL_WINDOW_LABEL)
  if (!existing) return false
  await existing.show()
  await existing.unminimize()
  await existing.setFocus()
  return true
}

export const createCallWindow = async (input: {
  mode?: 'video' | 'audio'
  /** 原始通话类型（写入通话记录；默认同 mode） */
  callType?: 'video' | 'audio'
  sessionId: string
  sceneType: 'user' | 'group'
  peerId: string
  displayName: string
  chatSessionId?: string
  inviteUserIds?: string[]
}) => {
  const sceneType = input.sceneType === 'group' ? 'group' : 'user'
  // 群聊一律打开视频通话窗
  const mode = sceneType === 'group' ? 'video' : input.mode === 'audio' ? 'audio' : 'video'
  const callType = input.callType === 'audio' || input.callType === 'video' ? input.callType : mode
  const chatSessionId = input.chatSessionId?.trim() || ''
  const inviteUserIds = (input.inviteUserIds || []).map((id) => id.trim()).filter(Boolean)
  const payload = {
    sessionId: input.sessionId,
    sceneType,
    callType,
    peerId: input.peerId,
    displayName: input.displayName || input.peerId,
    chatSessionId,
    inviteUserIds
  }
  const params = new URLSearchParams({
    sessionId: payload.sessionId,
    scene: payload.sceneType,
    peerId: payload.peerId,
    displayName: payload.displayName,
    callType: payload.callType
  })
  if (chatSessionId) {
    params.set('chatSessionId', chatSessionId)
  }
  if (inviteUserIds.length) {
    params.set('inviteUserIds', inviteUserIds.join(','))
  }
  const existing = await WebviewWindow.getByLabel(CALL_WINDOW_LABEL)
  if (existing) {
    await existing.show()
    await existing.unminimize()
    await existing.setFocus()
    await emitTo(CALL_WINDOW_LABEL, CALL_JOIN_EVENT, payload)
    return existing
  }

  return mode === 'audio'
    ? createWebviewWindow('语音通话', CALL_WINDOW_LABEL, {
        url: `${CALL_AUDIO_WINDOW_URL}?${params.toString()}`,
        width: CALL_AUDIO_WINDOW_WIDTH,
        height: CALL_AUDIO_WINDOW_HEIGHT,
        minWidth: CALL_AUDIO_WINDOW_WIDTH,
        minHeight: CALL_AUDIO_WINDOW_HEIGHT,
        resizable: false,
        transparent: true
      })
    : createWebviewWindow('视频通话', CALL_WINDOW_LABEL, {
        url: `${CALL_VIDEO_WINDOW_URL}?${params.toString()}`,
        width: CALL_VIDEO_WINDOW_WIDTH,
        height: CALL_VIDEO_WINDOW_HEIGHT,
        minWidth: CALL_VIDEO_WINDOW_WIDTH,
        minHeight: CALL_VIDEO_WINDOW_HEIGHT,
        resizable: true,
        transparent: true
      })
}

/** 通话邀请浮窗（右下角） */
export const createCallInviteWindow = async (payload: CallInviteWindowPayload) => {
  const sceneType = payload.sceneType === 'group' ? 'group' : 'user'
  const callType = payload.callType === 'audio' ? 'audio' : 'video'
  const toUserIds = (payload.toUserIds || []).map((id) => id.trim()).filter(Boolean)
  const nextPayload: CallInviteWindowPayload = {
    sessionId: payload.sessionId,
    fromId: payload.fromId,
    callType,
    sceneType,
    displayName: payload.displayName || payload.fromId,
    toUserIds
  }
  const params = new URLSearchParams({
    scene: nextPayload.sceneType,
    callType: nextPayload.callType,
    fromId: nextPayload.fromId,
    sessionId: nextPayload.sessionId,
    displayName: nextPayload.displayName
  })
  if (toUserIds.length) {
    params.set('toUserIds', toUserIds.join(','))
  }
  const existing = await WebviewWindow.getByLabel(CALL_INVITE_WINDOW_LABEL)
  if (existing) {
    await syncCallInviteWindowSize(existing)
    await placeWindowBottomRight(existing)
    await existing.show()
    await existing.unminimize()
    await existing.setFocus()
    await emitTo(CALL_INVITE_WINDOW_LABEL, CALL_INVITE_UPDATE_EVENT, nextPayload)
    return existing
  }

  const webview = await createWebviewWindow('通话邀请', CALL_INVITE_WINDOW_LABEL, {
    url: `${CALL_INVITE_WINDOW_URL}?${params.toString()}`,
    width: CALL_INVITE_WINDOW_WIDTH,
    height: CALL_INVITE_WINDOW_HEIGHT,
    minWidth: CALL_INVITE_WINDOW_WIDTH,
    minHeight: CALL_INVITE_WINDOW_HEIGHT,
    maxWidth: CALL_INVITE_WINDOW_WIDTH,
    maxHeight: CALL_INVITE_WINDOW_HEIGHT,
    center: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: false,
    visible: false
  })

  webview.once('tauri://created', () => {
    void placeWindowBottomRight(webview)
  })
  return webview
}

/** 关闭通话邀请窗；传入 sessionId 时仅匹配才关闭 */
export const closeCallInviteWindow = async (sessionId?: string) => {
  const webview = await WebviewWindow.getByLabel(CALL_INVITE_WINDOW_LABEL)
  if (!webview) return
  if (sessionId) {
    await emitTo(CALL_INVITE_WINDOW_LABEL, CALL_INVITE_HANGUP_EVENT, { sessionId })
    return
  }
  await webview.close()
}

const toChatSessionLabel = (chatId: string) =>
  `${CHAT_SESSION_WINDOW_LABEL_PREFIX}-${chatId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

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
    url: `${CHAT_SESSION_WINDOW_URL}?chatId=${encodeURIComponent(chat.id)}`,
    width: CHAT_SESSION_WINDOW_WIDTH,
    height: CHAT_SESSION_WINDOW_HEIGHT,
    minWidth: CHAT_SESSION_WINDOW_MIN_WIDTH,
    minHeight: CHAT_SESSION_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true,
    visible: true,
    dragDropEnabled: true
  })
}

const toMomentLabel = (userId: string) => `${MOMENT_WINDOW_LABEL_PREFIX}-${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`

export const createMomentWindow = (userId: string) =>
  createWebviewWindow('过往', toMomentLabel(userId), {
    url: `${MOMENT_WINDOW_URL}?userId=${encodeURIComponent(userId)}`,
    width: MOMENT_WINDOW_WIDTH,
    height: MOMENT_WINDOW_HEIGHT,
    minWidth: MOMENT_WINDOW_MIN_WIDTH,
    minHeight: MOMENT_WINDOW_MIN_HEIGHT,
    resizable: true,
    transparent: true
  })
