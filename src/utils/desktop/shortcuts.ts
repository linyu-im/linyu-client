import { watch } from 'vue'
import { register, unregisterAll, type ShortcutEvent } from '@tauri-apps/plugin-global-shortcut'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useAppSettingsStore } from '@/stores/app/appSettings'
import { useChatStore } from '@/stores/chat/chat'
import { useHomeTabStore } from '@/stores/app/homeTab'
import { useHomeNavBadgeStore } from '@/stores/app/homeNavBadge'
import { useShortcutConflictStore } from '@/stores/app/shortcutConflict'
import { HOME_WINDOW_LABEL } from '@/constants/window'
import { useSessionLockStore } from '@/stores/app/sessionLock'
import { openAndFocusWindow, openScreenshotWindow } from '@/utils/desktop/window'
import i18n from '@/services/i18n'

export type ShortcutBindingKey = 'sendVoice' | 'openUnread' | 'screenshot' | 'lock' | 'toggleWindow'

/** 仅走全局热键的动作（发语音改为聊天页本地快捷键） */
type GlobalShortcutAction = Exclude<ShortcutBindingKey, 'sendVoice'>

const SHORTCUT_LABEL_KEYS: Record<ShortcutBindingKey, string> = {
  sendVoice: 'settings.shortcuts.sendVoice',
  openUnread: 'settings.shortcuts.openUnread',
  screenshot: 'settings.shortcuts.screenshot',
  lock: 'settings.shortcuts.lock',
  toggleWindow: 'settings.shortcuts.toggleWindow'
}

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight'
])

let syncing = false
let initialized = false
let stopWatch: (() => void) | null = null

const t = (key: string, params?: Record<string, unknown>) => (params ? i18n.global.t(key, params) : i18n.global.t(key))

export const getShortcutActionLabel = (key: ShortcutBindingKey) => t(SHORTCUT_LABEL_KEYS[key])

/** 从键盘事件生成展示用快捷键字符串（与设置页默认格式一致） */
export const formatShortcutFromEvent = (event: KeyboardEvent): string | null => {
  if (event.key === 'Escape') return null

  if (MODIFIER_CODES.has(event.code)) {
    if (event.code === 'AltRight') return 'Right Alt'
    if (event.code === 'AltLeft') return 'Left Alt'
    return null
  }

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  let keyLabel = ''
  if (event.code.startsWith('Key') && event.code.length === 4) {
    keyLabel = event.code.slice(3)
  } else if (event.code.startsWith('Digit') && event.code.length === 6) {
    keyLabel = event.code.slice(5)
  } else if (event.code.startsWith('Numpad') && event.code.length > 6) {
    keyLabel = `Num${event.code.slice(6)}`
  } else if (/^F\d{1,2}$/.test(event.code)) {
    keyLabel = event.code
  } else {
    const specialMap: Record<string, string> = {
      Space: 'Space',
      Enter: 'Enter',
      Tab: 'Tab',
      Backspace: 'Backspace',
      Delete: 'Delete',
      Insert: 'Insert',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      Escape: 'Esc',
      Minus: '-',
      Equal: '=',
      BracketLeft: '[',
      BracketRight: ']',
      Backslash: '\\',
      Semicolon: ';',
      Quote: "'",
      Comma: ',',
      Period: '.',
      Slash: '/',
      Backquote: '`'
    }
    keyLabel = specialMap[event.code] || (event.key.length === 1 ? event.key.toUpperCase() : event.key)
  }

  if (!keyLabel) return null
  parts.push(keyLabel)
  return parts.join('+')
}

/** 展示串 → Tauri accelerator */
export const toAccelerator = (display: string): string | null => {
  const trimmed = display.trim()
  if (!trimmed) return null

  if (trimmed === 'Right Alt') return 'AltRight'
  if (trimmed === 'Left Alt') return 'AltLeft'

  const parts = trimmed
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return null

  const mapped = parts.map((part, index) => {
    const isLast = index === parts.length - 1
    const lower = part.toLowerCase()
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'command' || lower === 'meta') {
      return 'CommandOrControl'
    }
    if (lower === 'alt' || lower === 'option') return 'Alt'
    if (lower === 'shift') return 'Shift'
    if (lower === 'super' || lower === 'win' || lower === 'windows') return 'Super'
    if (part === 'Right Alt') return 'AltRight'
    if (part === 'Left Alt') return 'AltLeft'
    if (!isLast) return part
    if (part.length === 1) return part.toUpperCase()
    return part
  })

  return mapped.join('+')
}

/** 判断 KeyboardEvent 是否匹配设置中的快捷键展示串（如 Alt+V） */
export const matchShortcutEvent = (
  event: KeyboardEvent,
  display: string,
  options?: { ignoreModifiers?: boolean }
): boolean => {
  const trimmed = display.trim()
  if (!trimmed) return false

  if (trimmed === 'Right Alt') return event.code === 'AltRight'
  if (trimmed === 'Left Alt') return event.code === 'AltLeft'

  if (!options?.ignoreModifiers) {
    const formatted = formatShortcutFromEvent(event)
    if (!formatted) return false
    return formatted.toLowerCase() === trimmed.toLowerCase()
  }

  // keyup 时修饰键可能已松开，只比对主键
  const parts = trimmed
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
  const main = parts[parts.length - 1]
  if (!main) return false

  if (/^[A-Za-z]$/.test(main)) return event.code === `Key${main.toUpperCase()}`
  if (/^\d$/.test(main)) return event.code === `Digit${main}`
  if (/^F\d{1,2}$/i.test(main)) return event.code.toUpperCase() === main.toUpperCase()

  const specialCodeMap: Record<string, string> = {
    Space: 'Space',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
    Esc: 'Escape',
    '-': 'Minus',
    '=': 'Equal',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    '\\': 'Backslash',
    ';': 'Semicolon',
    "'": 'Quote',
    ',': 'Comma',
    '.': 'Period',
    '/': 'Slash',
    '`': 'Backquote'
  }
  const code = specialCodeMap[main]
  if (code) return event.code === code
  return event.key.toLowerCase() === main.toLowerCase()
}

export const findShortcutConflict = (
  key: ShortcutBindingKey,
  value: string,
  shortcuts: Record<ShortcutBindingKey, string>
): ShortcutBindingKey | null => {
  const normalized = value.trim()
  if (!normalized) return null
  const entries = Object.entries(shortcuts) as Array<[ShortcutBindingKey, string]>
  for (const [otherKey, otherValue] of entries) {
    if (otherKey === key) continue
    if (otherValue.trim() && otherValue.trim() === normalized) return otherKey
  }
  return null
}

/** 找出应用内值重复的全部快捷键 */
const collectInternalDuplicateKeys = (shortcuts: Record<ShortcutBindingKey, string>): ShortcutBindingKey[] => {
  const byValue = new Map<string, ShortcutBindingKey[]>()
  const entries = Object.entries(shortcuts) as Array<[ShortcutBindingKey, string]>
  for (const [key, value] of entries) {
    const normalized = value.trim()
    if (!normalized) continue
    const list = byValue.get(normalized) || []
    list.push(key)
    byValue.set(normalized, list)
  }

  const duplicates: ShortcutBindingKey[] = []
  for (const keys of byValue.values()) {
    if (keys.length > 1) duplicates.push(...keys)
  }
  return duplicates
}

const applyShortcutConflictResult = (keys: ShortcutBindingKey[]) => {
  const conflictStore = useShortcutConflictStore()
  conflictStore.setConflicts(keys)
  useHomeNavBadgeStore().syncMoreFromShortcutConflict(conflictStore.hasConflict())
}

const toggleHomeWindow = () => {
  WebviewWindow.getByLabel(HOME_WINDOW_LABEL).then((webview) => {
    if (!webview) return
    webview.isVisible().then((visible) => {
      if (visible) {
        void webview.hide()
        return
      }
      void webview.show().then(() => webview.setFocus())
    })
  })
}

const openFirstUnread = () => {
  const sessionLock = useSessionLockStore()
  if (sessionLock.locked) return

  const chatStore = useChatStore()
  const homeTabStore = useHomeTabStore()
  const unread = chatStore.chatList.find((item) => (item.unreadNum || 0) > 0)
  if (!unread) {
    window.$message?.info(t('settings.shortcuts.noUnread'))
    return
  }
  void openAndFocusWindow(HOME_WINDOW_LABEL).then(() => {
    void homeTabStore.navigateTo('message', { chatId: unread.id })
  })
}

const handleShortcutEvent = (action: GlobalShortcutAction, event: ShortcutEvent) => {
  if (event.state !== 'Pressed') return

  const sessionLock = useSessionLockStore()

  switch (action) {
    case 'openUnread':
      openFirstUnread()
      break
    case 'screenshot':
      if (sessionLock.locked) return
      void openScreenshotWindow()
      break
    case 'lock':
      sessionLock.lock()
      break
    case 'toggleWindow':
      toggleHomeWindow()
      break
  }
}

export const syncGlobalShortcuts = () => {
  if (syncing) return Promise.resolve()
  syncing = true

  const appSettings = useAppSettingsStore()
  const allShortcuts: Record<ShortcutBindingKey, string> = {
    sendVoice: appSettings.shortcuts.sendVoice,
    openUnread: appSettings.shortcuts.openUnread,
    screenshot: appSettings.shortcuts.screenshot,
    lock: appSettings.shortcuts.lock,
    toggleWindow: appSettings.shortcuts.toggleWindow
  }
  const duplicateKeys = new Set(collectInternalDuplicateKeys(allShortcuts))

  const bindings: Array<{ key: GlobalShortcutAction; display: string }> = [
    { key: 'openUnread', display: appSettings.shortcuts.openUnread },
    { key: 'screenshot', display: appSettings.shortcuts.screenshot },
    { key: 'lock', display: appSettings.shortcuts.lock },
    { key: 'toggleWindow', display: appSettings.shortcuts.toggleWindow }
  ]

  return unregisterAll()
    .catch(() => undefined)
    .then(() => {
      const tasks = bindings.map(({ key, display }) => {
        if (duplicateKeys.has(key)) {
          return Promise.resolve(null as ShortcutBindingKey | null)
        }
        const accelerator = toAccelerator(display)
        if (!accelerator) return Promise.resolve(null as ShortcutBindingKey | null)
        return register(accelerator, (event) => handleShortcutEvent(key, event))
          .then(() => null as ShortcutBindingKey | null)
          .catch((error) => {
            console.error(`[shortcuts] register failed: ${display} -> ${accelerator}`, error)
            return key
          })
      })

      return Promise.all(tasks)
    })
    .then((failedKeys) => {
      const conflicts = new Set<ShortcutBindingKey>(duplicateKeys)
      for (const key of failedKeys) {
        if (key) conflicts.add(key)
      }
      applyShortcutConflictResult(Array.from(conflicts))
    })
    .finally(() => {
      syncing = false
    })
}

/** 在首页挂载后初始化全局快捷键，并监听设置变更 */
export const initGlobalShortcuts = () => {
  if (initialized) {
    void syncGlobalShortcuts()
    return
  }
  initialized = true
  void syncGlobalShortcuts()

  const appSettings = useAppSettingsStore()
  stopWatch = watch(
    () => ({ ...appSettings.shortcuts }),
    () => {
      void syncGlobalShortcuts()
    },
    { deep: true }
  )
}

export const disposeGlobalShortcuts = () => {
  stopWatch?.()
  stopWatch = null
  initialized = false
  applyShortcutConflictResult([])
  void unregisterAll().catch(() => undefined)
}
