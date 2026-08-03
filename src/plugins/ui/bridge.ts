export interface PluginUiRequest {
  channel: 'linyu-plugin-ui'
  type: 'invoke'
  requestId: string
  method: string
  params?: unknown
}

export interface PluginUiResponse {
  channel: 'linyu-client-ui'
  type: 'result'
  requestId: string
  result?: unknown
  error?: string
}

export interface PluginUiEvent {
  channel: 'linyu-client-ui'
  type: 'event'
  event: string
  payload?: unknown
}

const UI_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  "font-src 'none'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ')

const UI_BRIDGE = `
<script>
(() => {
  'use strict'
  for (const name of ['__TAURI__', '__TAURI_INTERNALS__', '__TAURI_IPC__']) {
    try {
      delete window[name]
      Object.defineProperty(window, name, { value: undefined, writable: false, configurable: false })
    } catch (_) {}
  }
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport', 'RTCPeerConnection']) {
    try {
      Object.defineProperty(window, name, { value: undefined, writable: false, configurable: false })
    } catch (_) {}
  }
  let sequence = 0
  const pending = new Map()
  const eventListeners = new Map()
  const clonePayload = (value) => {
    if (value === undefined) return undefined
    return JSON.parse(JSON.stringify(value))
  }
  const invoke = (method, params = {}) => {
    const requestId = 'ui-api-' + Date.now().toString(36) + '-' + (++sequence).toString(36)
    return new Promise((resolve, reject) => {
      let safeParams
      try {
        safeParams = clonePayload(params ?? {})
      } catch (_) {
        reject(new Error('PLUGIN_API_PAYLOAD_INVALID'))
        return
      }
      pending.set(requestId, { resolve, reject })
      parent.postMessage({ channel: 'linyu-plugin-ui', type: 'invoke', requestId, method, params: safeParams }, '*')
    })
  }
  const api = Object.freeze({
    rpc: invoke,
    user: Object.freeze({ getCurrent: () => invoke('user.getCurrent') }),
    system: Object.freeze({
      getAppearance: () => invoke('system.getAppearance'),
      getLocale: () => invoke('system.getLocale'),
      getPlatform: () => invoke('system.getPlatform')
    }),
    events: Object.freeze({
      on(name, listener) {
        if (typeof name !== 'string' || typeof listener !== 'function') throw new Error('PLUGIN_EVENT_LISTENER_INVALID')
        if (!eventListeners.has(name)) eventListeners.set(name, new Set())
        eventListeners.get(name).add(listener)
        return () => eventListeners.get(name)?.delete(listener)
      },
      once(name, listener) {
        let dispose
        dispose = this.on(name, (payload) => {
          dispose?.()
          listener(payload)
        })
        return dispose
      },
      off(name, listener) {
        eventListeners.get(name)?.delete(listener)
      }
    }),
    storage: Object.freeze({
      get: (key) => invoke('storage.get', { key }),
      set: (key, value) => invoke('storage.set', { key, value }),
      delete: (key) => invoke('storage.delete', { key }),
      keys: () => invoke('storage.keys')
    }),
    network: Object.freeze({ fetch: (url, options = {}) => invoke('network.fetch', { url, ...options }) }),
    notifications: Object.freeze({ show: (options) => invoke('notifications.show', options) }),
    dialog: Object.freeze({
      openFile: (options = {}) => invoke('dialog.openFile', options),
      openDirectory: (options = {}) => invoke('dialog.openDirectory', options),
      saveFile: (options = {}) => invoke('dialog.saveFile', options),
      message: (message, options = {}) => invoke('dialog.message', { message, ...options }),
      confirm: (message, options = {}) => invoke('dialog.confirm', { message, ...options })
    }),
    files: Object.freeze({
      readText: (handle) => invoke('files.readText', { handleId: handle?.id || handle }),
      readBinary: (handle) => invoke('files.readBinary', { handleId: handle?.id || handle }),
      writeText: (handle, content) => invoke('files.writeText', { handleId: handle?.id || handle, content }),
      writeBinary: (handle, content) => invoke('files.writeBinary', { handleId: handle?.id || handle, content }),
      stat: (handle) => invoke('files.stat', { handleId: handle?.id || handle }),
      exists: (handle) => invoke('files.exists', { handleId: handle?.id || handle }),
      pluginData: Object.freeze({
        readText: (path) => invoke('files.pluginData.readText', { path }),
        writeText: (path, content) => invoke('files.pluginData.writeText', { path, content })
      })
    }),
    window: Object.freeze({
      close: () => invoke('window.close'),
      minimize: () => invoke('window.minimize'),
      maximize: () => invoke('window.maximize'),
      unmaximize: () => invoke('window.unmaximize'),
      toggleMaximize: () => invoke('window.toggleMaximize'),
      isMaximized: () => invoke('window.isMaximized'),
      show: () => invoke('window.show'),
      hide: () => invoke('window.hide'),
      focus: () => invoke('window.focus'),
      center: () => invoke('window.center'),
      getSize: () => invoke('window.getSize'),
      setSize: (width, height) => invoke('window.setSize', { width, height }),
      setTitle: (title) => invoke('window.setTitle', { title }),
      startDragging: () => invoke('window.startDragging'),
      setFullscreen: (fullscreen) => invoke('window.setFullscreen', { fullscreen }),
      setAlwaysOnTop: (alwaysOnTop) => invoke('window.setAlwaysOnTop', { alwaysOnTop })
    }),
    windows: Object.freeze({ open: (windowId) => invoke('windows.open', { windowId }) }),
    clipboard: Object.freeze({
      readText: () => invoke('clipboard.readText'),
      writeText: (text) => invoke('clipboard.writeText', { text })
    }),
    external: Object.freeze({ openUrl: (url) => invoke('external.openUrl', { url }) }),
    log: Object.freeze({
      debug: (message) => invoke('log', { level: 'debug', message: String(message) }),
      info: (message) => invoke('log', { level: 'info', message: String(message) }),
      warn: (message) => invoke('log', { level: 'warn', message: String(message) }),
      error: (message) => invoke('log', { level: 'error', message: String(message) })
    }),
    commands: Object.freeze({ execute: (command, args) => invoke('commands.execute', { command, args }) }),
    app: Object.freeze({
      getInfo: () => invoke('app.getInfo'),
      getVersion: () => invoke('app.getVersion'),
      getCapabilities: () => invoke('app.getCapabilities')
    })
  })
  Object.defineProperty(window, 'linyu', { value: api, writable: false, configurable: false })
  window.addEventListener('message', (event) => {
    if (event.source !== parent) return
    const message = event.data
    if (!message || message.channel !== 'linyu-client-ui') return
    if (message.type === 'event' && typeof message.event === 'string') {
      for (const listener of eventListeners.get(message.event) || []) {
        try {
          listener(message.payload)
        } catch (error) {
          console.error('[linyu-plugin-ui] event listener failed', error)
        }
      }
      return
    }
    if (message.type !== 'result') return
    const request = pending.get(message.requestId)
    if (!request) return
    pending.delete(message.requestId)
    if (message.error) request.reject(new Error(message.error))
    else request.resolve(message.result)
  })
  parent.postMessage({ channel: 'linyu-plugin-ui', type: 'ready' }, '*')
})()
</script>
`

export function buildPluginUiDocument(html: string) {
  const security = `<meta http-equiv="Content-Security-Policy" content="${UI_CSP}">${UI_BRIDGE}`
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${security}`)
  }
  return `<!doctype html><html><head>${security}</head><body>${html}</body></html>`
}
