export const PLUGIN_WORKER_BOOTSTRAP = `
(() => {
  'use strict'

  let definition = null
  let sequence = 0
  const pendingApi = new Map()
  const eventListeners = new Map()

  const invoke = (method, params = {}) => {
    const requestId = 'api-' + Date.now().toString(36) + '-' + (++sequence).toString(36)
    return new Promise((resolve, reject) => {
      let safeParams
      try {
        safeParams = JSON.parse(JSON.stringify(params ?? {}))
      } catch (_) {
        reject(new Error('PLUGIN_API_PAYLOAD_INVALID'))
        return
      }
      pendingApi.set(requestId, { resolve, reject })
      self.postMessage({ channel: 'linyu-plugin', type: 'invoke', requestId, method, params: safeParams })
    })
  }

  const api = Object.freeze({
    register(value) {
      if (!value || typeof value !== 'object') throw new Error('PLUGIN_DEFINITION_INVALID')
      definition = value
    },
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
      }
    }),
    storage: Object.freeze({
      get: (key) => invoke('storage.get', { key }),
      set: (key, value) => invoke('storage.set', { key, value }),
      delete: (key) => invoke('storage.delete', { key }),
      keys: () => invoke('storage.keys')
    }),
    network: Object.freeze({
      fetch: (url, options = {}) => invoke('network.fetch', { url, ...options })
    }),
    notifications: Object.freeze({ show: (options) => invoke('notifications.show', options) }),
    files: Object.freeze({
      pluginData: Object.freeze({
        readText: (path) => invoke('files.pluginData.readText', { path }),
        writeText: (path, content) => invoke('files.pluginData.writeText', { path, content })
      })
    }),
    app: Object.freeze({
      getInfo: () => invoke('app.getInfo'),
      getVersion: () => invoke('app.getVersion'),
      getCapabilities: () => invoke('app.getCapabilities')
    }),
    log: Object.freeze({
      debug: (message) => invoke('log', { level: 'debug', message: String(message) }),
      info: (message) => invoke('log', { level: 'info', message: String(message) }),
      warn: (message) => invoke('log', { level: 'warn', message: String(message) }),
      error: (message) => invoke('log', { level: 'error', message: String(message) })
    })
  })

  Object.defineProperty(globalThis, 'linyu', {
    value: api,
    writable: false,
    configurable: false,
    enumerable: true
  })

  for (const name of [
    'fetch',
    'WebSocket',
    'EventSource',
    'WebTransport',
    'XMLHttpRequest',
    'Worker',
    'SharedWorker',
    'RTCPeerConnection',
    'importScripts'
  ]) {
    try {
      Object.defineProperty(globalThis, name, {
        value: undefined,
        writable: false,
        configurable: false
      })
    } catch (_) {}
  }

  const serializeError = (error) => {
    if (error instanceof Error) return error.message
    return String(error)
  }

  self.addEventListener('message', async (event) => {
    const message = event.data
    if (!message || message.channel !== 'linyu-client') return

    if (message.type === 'result') {
      const pending = pendingApi.get(message.requestId)
      if (!pending) return
      pendingApi.delete(message.requestId)
      if (message.error) pending.reject(new Error(message.error))
      else pending.resolve(message.result)
      return
    }

    if (message.type === 'event' && typeof message.event === 'string') {
      for (const listener of eventListeners.get(message.event) || []) {
        try {
          listener(message.payload)
        } catch (error) {
          console.error('[linyu-plugin] event listener failed', error)
        }
      }
      return
    }

    if (message.type === 'activate') {
      try {
        if (typeof definition?.activate === 'function') await definition.activate(api)
        self.postMessage({ channel: 'linyu-plugin', type: 'activated' })
      } catch (error) {
        self.postMessage({ channel: 'linyu-plugin', type: 'runtimeError', error: serializeError(error) })
      }
      return
    }

    if (message.type === 'deactivate') {
      try {
        if (typeof definition?.deactivate === 'function') await definition.deactivate()
      } finally {
        self.close()
      }
      return
    }

    if (message.type === 'execute') {
      try {
        const handler = definition?.commands?.[message.command]
        if (typeof handler !== 'function') throw new Error('PLUGIN_COMMAND_NOT_FOUND:' + message.command)
        const result = await handler(message.args, api)
        self.postMessage({
          channel: 'linyu-plugin',
          type: 'executeResult',
          requestId: message.requestId,
          result
        })
      } catch (error) {
        self.postMessage({
          channel: 'linyu-plugin',
          type: 'executeResult',
          requestId: message.requestId,
          error: serializeError(error)
        })
      }
    }
  })

  self.postMessage({ channel: 'linyu-plugin', type: 'ready' })
})()
`
