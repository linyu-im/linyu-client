import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event'
import { PLUGIN_RUNTIME_REQUEST_EVENT, PLUGIN_RUNTIME_RESPONSE_EVENT } from '@/constants/event'
import { PLUGIN_RUNTIME_WINDOW_LABEL } from '@/constants/window'
import { getCurrentWindowLabel } from '@/utils/desktop/window'
import type { PluginRuntimeRequest, PluginRuntimeResponse } from '@/types/plugin'

interface PendingCommand {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const pending = new Map<string, PendingCommand>()
let unlistenPromise: Promise<UnlistenFn> | null = null

const ensureListener = () => {
  if (!unlistenPromise) {
    unlistenPromise = listen<PluginRuntimeResponse>(PLUGIN_RUNTIME_RESPONSE_EVENT, (event) => {
      const request = pending.get(event.payload.requestId)
      if (!request) return
      clearTimeout(request.timeout)
      pending.delete(event.payload.requestId)
      if (event.payload.error) request.reject(new Error(event.payload.error))
      else request.resolve(event.payload.result)
    })
  }
  return unlistenPromise
}

export function executePluginCommand(pluginId: string, command: string, args?: unknown) {
  return ensureListener().then(
    () =>
      new Promise<unknown>((resolve, reject) => {
        const requestId = `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
        const timeout = setTimeout(() => {
          pending.delete(requestId)
          reject(new Error('PLUGIN_COMMAND_TIMEOUT'))
        }, 15_000)
        pending.set(requestId, { resolve, reject, timeout })
        const request: PluginRuntimeRequest = {
          requestId,
          replyLabel: getCurrentWindowLabel(),
          pluginId,
          command,
          args
        }
        emitTo(PLUGIN_RUNTIME_WINDOW_LABEL, PLUGIN_RUNTIME_REQUEST_EVENT, request).catch((error) => {
          clearTimeout(timeout)
          pending.delete(requestId)
          reject(error)
        })
      })
  )
}
