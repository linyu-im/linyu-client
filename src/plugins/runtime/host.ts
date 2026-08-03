import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event'
import * as pluginApiService from '@/services/pluginApiService'
import * as pluginService from '@/services/pluginService'
import { useUserStore } from '@/stores/user/user'
import type { InstalledPlugin, PluginRuntimeRequest, PluginRuntimeResponse } from '@/types/plugin'
import {
  executePluginContextApi,
  getPluginAppearance,
  PLUGIN_APPEARANCE_EVENT,
  subscribePluginAppearance
} from '@/plugins/runtime/context'
import { PLUGIN_WORKER_BOOTSTRAP } from '@/plugins/runtime/workerBootstrap'

interface WorkerMessage {
  channel: 'linyu-plugin'
  type: 'ready' | 'activated' | 'invoke' | 'executeResult' | 'runtimeError'
  requestId?: string
  method?: string
  params?: unknown
  result?: unknown
  error?: string
}

interface RuntimeWorker {
  worker: Worker
  objectUrl: string
  pendingCommands: Map<string, PendingRuntimeCommand>
}

interface PendingRuntimeCommand {
  timeout: ReturnType<typeof setTimeout>
  request: PluginRuntimeRequest
  onResult: (event: MessageEvent<WorkerMessage>) => void
}

interface PluginLifecycleEvent {
  pluginId: string
  action: 'reload' | 'enable' | 'disable' | 'uninstall'
}

const COMMAND_TIMEOUT = 15_000
const MAX_RPC_PAYLOAD = 1024 * 1024

const payloadIsAllowed = (value: unknown) => {
  try {
    return JSON.stringify(value ?? null).length <= MAX_RPC_PAYLOAD
  } catch {
    return false
  }
}

export class PluginHost {
  private workers = new Map<string, RuntimeWorker>()
  private starting = new Map<string, Promise<void>>()
  private unlisteners: UnlistenFn[] = []
  private stopAppearanceSubscription: (() => void) | undefined
  private userStore = useUserStore()

  initialize() {
    this.stopAppearanceSubscription = subscribePluginAppearance((appearance) => {
      this.workers.forEach((runtime) => {
        runtime.worker.postMessage({
          channel: 'linyu-client',
          type: 'event',
          event: PLUGIN_APPEARANCE_EVENT,
          payload: appearance
        })
      })
    })
    return Promise.all([
      listen<PluginLifecycleEvent>('plugin:lifecycle', (event) => this.onLifecycle(event.payload)),
      listen<PluginRuntimeRequest>('plugin-runtime:request', (event) => this.onRuntimeRequest(event.payload)),
      pluginService.list().then((plugins) => {
        return Promise.all(
          plugins
            .filter((plugin) => plugin.enabled && this.activatesOnStartup(plugin))
            .map((plugin) =>
              this.start(plugin).catch((error) => console.error(`[plugin:${plugin.id}] failed to start`, error))
            )
        ).then(() => undefined)
      })
    ]).then((results) => {
      this.unlisteners = results.filter((result): result is UnlistenFn => typeof result === 'function')
    })
  }

  destroy() {
    this.stopAppearanceSubscription?.()
    this.stopAppearanceSubscription = undefined
    this.unlisteners.forEach((unlisten) => unlisten())
    this.unlisteners = []
    for (const pluginId of this.workers.keys()) {
      this.stop(pluginId)
    }
  }

  private start(plugin: InstalledPlugin) {
    const starting = this.starting.get(plugin.id)
    if (starting) return starting
    this.stop(plugin.id)
    const task = pluginService
      .readEntry(plugin.id, 'worker')
      .then((entry) => {
        const objectUrl = URL.createObjectURL(
          new Blob([PLUGIN_WORKER_BOOTSTRAP, '\n', entry.content], { type: 'text/javascript' })
        )
        const worker = new Worker(objectUrl, { name: `linyu-plugin:${plugin.id}` })
        const runtime: RuntimeWorker = {
          worker,
          objectUrl,
          pendingCommands: new Map()
        }
        worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
          this.onWorkerMessage(plugin.id, runtime, event.data)
        })
        worker.addEventListener('error', (event) => {
          console.error(`[plugin:${plugin.id}] worker error`, event.message)
        })
        this.workers.set(plugin.id, runtime)
      })
      .finally(() => {
        this.starting.delete(plugin.id)
      })
    this.starting.set(plugin.id, task)
    return task
  }

  private stop(pluginId: string) {
    const runtime = this.workers.get(pluginId)
    if (!runtime) return
    runtime.worker.postMessage({ channel: 'linyu-client', type: 'deactivate' })
    runtime.pendingCommands.forEach((pending) => {
      clearTimeout(pending.timeout)
      runtime.worker.removeEventListener('message', pending.onResult)
      this.reply(pending.request, { requestId: pending.request.requestId, error: 'PLUGIN_RUNTIME_STOPPED' })
    })
    runtime.pendingCommands.clear()
    setTimeout(() => runtime.worker.terminate(), 200)
    URL.revokeObjectURL(runtime.objectUrl)
    this.workers.delete(pluginId)
  }

  private onLifecycle(event: PluginLifecycleEvent) {
    if (event.action === 'disable' || event.action === 'uninstall') {
      this.stop(event.pluginId)
      return
    }
    pluginService
      .list()
      .then((plugins) => plugins.find((plugin) => plugin.id === event.pluginId))
      .then((plugin) => {
        this.stop(event.pluginId)
        if (plugin?.enabled && this.activatesOnStartup(plugin)) {
          return this.start(plugin)
        }
      })
      .catch((error) => console.error(`[plugin:${event.pluginId}] failed to reload`, error))
  }

  private onWorkerMessage(pluginId: string, runtime: RuntimeWorker, message: WorkerMessage) {
    if (!message || message.channel !== 'linyu-plugin') return
    if (message.type === 'ready') {
      runtime.worker.postMessage({ channel: 'linyu-client', type: 'activate' })
      return
    }
    if (message.type === 'invoke' && message.requestId && message.method) {
      if (!payloadIsAllowed(message.params)) {
        runtime.worker.postMessage({
          channel: 'linyu-client',
          type: 'result',
          requestId: message.requestId,
          error: 'PLUGIN_API_PAYLOAD_INVALID'
        })
        return
      }
      const execution =
        executePluginContextApi(pluginId, message.method) ||
        pluginApiService.invokePluginApi(pluginId, this.userStore.authInfo.userId, message.method, message.params)
      execution
        .then((result) => {
          let safeResult = result
          try {
            safeResult = result === undefined ? undefined : JSON.parse(JSON.stringify(result))
          } catch {
            runtime.worker.postMessage({
              channel: 'linyu-client',
              type: 'result',
              requestId: message.requestId,
              error: 'PLUGIN_API_RESULT_INVALID'
            })
            return
          }
          runtime.worker.postMessage({
            channel: 'linyu-client',
            type: 'result',
            requestId: message.requestId,
            result: safeResult
          })
        })
        .catch((error) => {
          runtime.worker.postMessage({
            channel: 'linyu-client',
            type: 'result',
            requestId: message.requestId,
            error: String(error)
          })
        })
      return
    }
    if (message.type === 'activated') {
      runtime.worker.postMessage({
        channel: 'linyu-client',
        type: 'event',
        event: PLUGIN_APPEARANCE_EVENT,
        payload: getPluginAppearance()
      })
      return
    }
    if (message.type === 'runtimeError') {
      console.error(`[plugin:${pluginId}] runtime error`, message.error)
    }
  }

  private onRuntimeRequest(request: PluginRuntimeRequest) {
    const runtime = this.workers.get(request.pluginId)
    if (!runtime) {
      pluginService
        .list()
        .then((plugins) => plugins.find((plugin) => plugin.id === request.pluginId && plugin.enabled))
        .then((plugin) => {
          if (!plugin) throw new Error('PLUGIN_RUNTIME_NOT_ACTIVE')
          if (!this.activatesOnCommand(plugin, request.command)) {
            throw new Error(`PLUGIN_ACTIVATION_EVENT_MISSING:onCommand:${request.command}`)
          }
          return this.start(plugin)
        })
        .then(() => this.dispatchRuntimeRequest(request))
        .catch((error) => this.reply(request, { requestId: request.requestId, error: String(error) }))
      return
    }

    this.dispatchRuntimeRequest(request)
  }

  private dispatchRuntimeRequest(request: PluginRuntimeRequest) {
    const runtime = this.workers.get(request.pluginId)
    if (!runtime) {
      this.reply(request, { requestId: request.requestId, error: 'PLUGIN_RUNTIME_NOT_ACTIVE' })
      return
    }

    const onResult = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data
      if (message?.type !== 'executeResult' || message.requestId !== request.requestId) return
      runtime.worker.removeEventListener('message', onResult)
      const pending = runtime.pendingCommands.get(request.requestId)
      if (pending) clearTimeout(pending.timeout)
      runtime.pendingCommands.delete(request.requestId)
      const resultAllowed = payloadIsAllowed({ result: message.result, error: message.error })
      this.reply(request, {
        requestId: request.requestId,
        result: resultAllowed ? message.result : undefined,
        error: resultAllowed ? message.error : 'PLUGIN_COMMAND_RESULT_TOO_LARGE'
      })
    }
    const timeout = setTimeout(() => {
      runtime.worker.removeEventListener('message', onResult)
      runtime.pendingCommands.delete(request.requestId)
      this.reply(request, { requestId: request.requestId, error: 'PLUGIN_COMMAND_TIMEOUT' })
    }, COMMAND_TIMEOUT)
    runtime.pendingCommands.set(request.requestId, { timeout, request, onResult })
    runtime.worker.addEventListener('message', onResult)
    runtime.worker.postMessage({
      channel: 'linyu-client',
      type: 'execute',
      requestId: request.requestId,
      command: request.command,
      args: request.args
    })
  }

  private reply(request: PluginRuntimeRequest, response: PluginRuntimeResponse) {
    emitTo(request.replyLabel, 'plugin-runtime:response', response).catch((error) => {
      console.error('[plugin-runtime] failed to reply', error)
    })
  }

  private activatesOnStartup(plugin: InstalledPlugin) {
    return plugin.manifest.activationEvents.length === 0 || plugin.manifest.activationEvents.includes('onStartup')
  }

  private activatesOnCommand(plugin: InstalledPlugin, command: string) {
    return (
      plugin.manifest.activationEvents.length === 0 ||
      plugin.manifest.activationEvents.includes('onStartup') ||
      plugin.manifest.activationEvents.includes(`onCommand:${command}`)
    )
  }
}
