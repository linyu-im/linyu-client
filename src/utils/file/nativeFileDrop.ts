import { getCurrentWebview, type DragDropEvent } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { stat } from '@tauri-apps/plugin-fs'
import { readPathAsFile } from '@/utils/file/filePick'

export interface OsFileDropHandlers {
  /** 返回拖放目标；未挂载 / keep-alive 失活时应返回 null */
  getTarget: () => HTMLElement | null | undefined
  /** 是否要求光标落在目标内；默认 true */
  requireHitTest?: boolean
  onEnter?: (paths: string[]) => void
  onOver?: () => void
  onLeave?: () => void
  onDrop: (paths: string[]) => void
}

const osFileDropSubscribers = new Map<number, OsFileDropHandlers>()
let nextSubscriberId = 0
let osFileDropListenerPromise: Promise<void> | null = null
let cachedScaleFactor = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

const refreshScaleFactor = () => {
  getCurrentWindow()
    .scaleFactor()
    .then((factor) => {
      if (factor > 0) cachedScaleFactor = factor
    })
    .catch(() => {})
}

const toCssPoint = (physicalX: number, physicalY: number) => {
  const scale = cachedScaleFactor > 0 ? cachedScaleFactor : window.devicePixelRatio || 1
  return {
    x: physicalX / scale,
    y: physicalY / scale
  }
}

const isPointInside = (el: HTMLElement, x: number, y: number) => {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

const isTargetActive = (el: HTMLElement) => el.isConnected && el.getBoundingClientRect().width > 0

/** 过滤目录，只保留普通文件路径 */
export const filterExistingFilePaths = (paths: string[]) => {
  return Promise.all(
    paths.map((path) =>
      stat(path)
        .then((info) => (info.isFile ? path : null))
        .catch(() => null)
    )
  ).then((list) => list.filter((path): path is string => Boolean(path)))
}

/** 本地路径 → 带 `__filePath` 的 File（与选文件对话框一致） */
export const readPathsAsFiles = (paths: string[]) => {
  return filterExistingFilePaths(paths).then((filePaths) => Promise.all(filePaths.map((path) => readPathAsFile(path))))
}

/**
 * 监听 Tauri OS 级文件拖放，直接拿到本地绝对路径。
 * 要求窗口 `dragDropEnabled: true`（与 HTML5 File drop 互斥）。
 * 无单独「取 File.path」插件；tauri-plugin-drag 仅用于拖出。
 */
const dispatchOsFileDrop = (handlers: OsFileDropHandlers, event: { payload: DragDropEvent }) => {
  const payload = event.payload
  if (payload.type === 'leave') {
    handlers.onLeave?.()
    return
  }

  const el = handlers.getTarget()
  if (!el || !isTargetActive(el)) {
    handlers.onLeave?.()
    return
  }

  const requireHitTest = handlers.requireHitTest !== false
  const { x, y } = toCssPoint(payload.position.x, payload.position.y)
  const inside = requireHitTest ? isPointInside(el, x, y) : true
  if (!inside) {
    handlers.onLeave?.()
    return
  }

  if (payload.type === 'enter') {
    handlers.onEnter?.(payload.paths)
    return
  }
  if (payload.type === 'over') {
    handlers.onOver?.()
    return
  }
  if (payload.type === 'drop') {
    handlers.onLeave?.()
    if (payload.paths.length) handlers.onDrop(payload.paths)
  }
}

const ensureOsFileDropListener = () => {
  if (osFileDropListenerPromise) return osFileDropListenerPromise

  refreshScaleFactor()
  osFileDropListenerPromise = getCurrentWebview()
    .onDragDropEvent((event) => {
      osFileDropSubscribers.forEach((handlers) => {
        dispatchOsFileDrop(handlers, event)
      })
    })
    .then(() => undefined)
    .catch((error) => {
      osFileDropListenerPromise = null
      throw error
    })
  return osFileDropListenerPromise
}

/** 在窗口入口预热唯一的原生拖放监听，避免业务组件首次显示时才注册 IPC 事件 */
export const initOsFileDropListener = () => ensureOsFileDropListener()

export const listenOsFileDrop = (handlers: OsFileDropHandlers) => {
  const subscriberId = nextSubscriberId++
  osFileDropSubscribers.set(subscriberId, handlers)

  return ensureOsFileDropListener().then(
    () => () => {
      osFileDropSubscribers.delete(subscriberId)
    },
    (error) => {
      osFileDropSubscribers.delete(subscriberId)
      throw error
    }
  )
}
