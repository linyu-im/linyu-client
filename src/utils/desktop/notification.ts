import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { useHomeTabStore } from '@/stores/app/homeTab'
import { createHomeWinodw } from '@/utils/desktop/window'

export type WorkNotificationKind = 'completed' | 'failed' | 'permission'

export interface WorkNotificationExtra {
  type: 'work'
  kind: WorkNotificationKind
  conversationId: string
}

export interface AppNotificationOptions {
  title: string
  body?: string
  extra?: WorkNotificationExtra | Record<string, unknown>
}

let actionListener: UnlistenFn | undefined
let actionListening = false

export const ensureNotificationPermission = async (): Promise<boolean> => {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const permission = await requestPermission()
      granted = permission === 'granted'
    }
    return granted
  } catch (error) {
    console.warn('[notification] permission check failed', error)
    return false
  }
}

/** @returns whether the OS notification was sent successfully */
export const showNotification = async (options: AppNotificationOptions): Promise<boolean> => {
  const title = options.title?.trim()
  if (!title) {
    console.warn('[notification] title is required')
    return false
  }
  try {
    const granted = await ensureNotificationPermission()
    if (!granted) {
      console.warn('[notification] permission not granted')
      return false
    }
    const input: AppNotificationOptions = {
      title,
      body: options.body?.trim() || undefined
    }
    if (options.extra) input.extra = options.extra
    await invoke<void>('show_app_notification', { input })
    return true
  } catch (error) {
    console.warn('[notification] send failed', error)
    return false
  }
}

const handleWorkNotificationAction = (extra: Record<string, unknown> | undefined) => {
  if (!extra || extra.type !== 'work') return
  const conversationId = String(extra.conversationId || '')
  if (!conversationId) return
  createHomeWinodw()
    .then(() => {
      useHomeTabStore().openAiConversation(conversationId)
    })
    .catch(() => undefined)
}

/** Singleton: click OS notification → focus home and open the AI conversation */
export const ensureNotificationActionListener = async (): Promise<void> => {
  if (actionListening) return
  actionListening = true
  try {
    actionListener = await listen<Record<string, unknown>>('app://notification-action', (event) => {
      handleWorkNotificationAction(event.payload)
    })
  } catch (error) {
    console.warn('[notification] action listener unavailable', error)
    actionListening = false
  }
}

export const stopNotificationActionListener = async (): Promise<void> => {
  actionListener?.()
  actionListener = undefined
  actionListening = false
}
