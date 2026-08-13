import { defaultWindowIcon } from '@tauri-apps/api/app'
import { emit, emitTo } from '@tauri-apps/api/event'
import { TrayIcon, TrayIconEvent, TrayIconOptions } from '@tauri-apps/api/tray'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getAllWindows, LogicalSize, PhysicalPosition } from '@tauri-apps/api/window'
import { MESSAGE_REMIND_SHOW_EVENT, TRAY_MENU_SYNC_EVENT } from '@/constants/event'
import { HOME_WINDOW_LABEL, LOGIN_WINDOW_LABEL, TRAY_WINDOW_LABEL } from '@/constants/window'
import { useMessageRemindStore, type MessageRemindTrayRect } from '@/stores/message/messageRemind'
import { useSessionLockStore } from '@/stores/app/sessionLock'
import { createLoginWindow } from '@/utils/desktop/window'

export const TRAY_ID = 'tray'

export const TRAY_MENU_WIDTH = 150
export const TRAY_MENU_ITEM_HEIGHT = 30
export const TRAY_MENU_PAD_Y = 10
export const TRAY_MENU_DIVIDER_HEIGHT = 9

const BLUR_GUARD_MS = 200

let trayMenuLoggedIn = false
let blurGuardUntil = 0

export const setTrayMenuLoggedIn = (loggedIn: boolean) => {
  trayMenuLoggedIn = loggedIn
}

/** 以 home 窗口是否存在判断主会话是否已登录 */
export const isHomeSessionActive = async () => {
  const windows = await getAllWindows()
  return windows.some((window) => window.label === HOME_WINDOW_LABEL)
}

/** 完整托盘菜单：有 home 且未锁屏；锁屏/未登录仅「退出」 */
export const shouldShowFullTrayMenu = async () => {
  if (useSessionLockStore().locked) return false
  return isHomeSessionActive()
}

const syncTrayMenuLoggedIn = async () => {
  const loggedIn = await shouldShowFullTrayMenu()
  setTrayMenuLoggedIn(loggedIn)
  await emitTo(TRAY_WINDOW_LABEL, TRAY_MENU_SYNC_EVENT, { loggedIn }).catch(() => undefined)
  return loggedIn
}

const toTrayRect = (rect: TrayIconEvent['rect']): MessageRemindTrayRect => ({
  position: { x: rect.position.x, y: rect.position.y },
  size: { width: rect.size.width, height: rect.size.height }
})

export const getTrayMenuHeight = (loggedIn: boolean) => {
  if (!loggedIn) return TRAY_MENU_PAD_Y + TRAY_MENU_ITEM_HEIGHT
  // 打开林语 / 锁定 / 设置 + 分割线 + 退出
  return TRAY_MENU_PAD_Y + TRAY_MENU_ITEM_HEIGHT * 4 + TRAY_MENU_DIVIDER_HEIGHT
}

/** 优先打开 home，否则 login（不存在则重建登录窗） */
export const openMainWindow = async () => {
  const windows = await getAllWindows()
  const home = windows.find((window) => window.label === HOME_WINDOW_LABEL)
  if (home) {
    await home.show()
    await home.unminimize()
    await home.setFocus()
    return
  }
  const login = windows.find((window) => window.label === LOGIN_WINDOW_LABEL)
  if (login) {
    await login.show()
    await login.unminimize()
    await login.setFocus()
    return
  }
  await createLoginWindow()
}

export const hideTrayMenuWindow = async () => {
  const trayWindow = await WebviewWindow.getByLabel(TRAY_WINDOW_LABEL)
  await trayWindow?.hide()
}

const showTrayMenuWindow = async (event: TrayIconEvent) => {
  const trayWindow = await WebviewWindow.getByLabel(TRAY_WINDOW_LABEL)
  if (!trayWindow) {
    console.log('tray window not found')
    return
  }

  const height = getTrayMenuHeight(trayMenuLoggedIn)
  await trayWindow.setSize(new LogicalSize(TRAY_MENU_WIDTH, height)).catch(() => undefined)

  const outerSize = await trayWindow.outerSize()
  const x = Math.round(event.rect.position.x)
  const y = Math.round(event.rect.position.y - outerSize.height)
  blurGuardUntil = Date.now() + BLUR_GUARD_MS
  await trayWindow.setPosition(new PhysicalPosition(x, y))
  await trayWindow.show()
  await trayWindow.unmaximize()
  await trayWindow.setFocus()
}

export const setTrayEvent = async () => {
  const trayWindow = await WebviewWindow.getByLabel(TRAY_WINDOW_LABEL)
  if (trayWindow) {
    await trayWindow.listen('tauri://blur', async () => {
      if (Date.now() < blurGuardUntil) return
      await trayWindow.hide()
    })
  }
}

export const initSystemTray = async () => {
  const tray = await TrayIcon.getById(TRAY_ID)
  if (tray) return

  const options: TrayIconOptions = {
    id: TRAY_ID,
    tooltip: '林语',
    action: (event: TrayIconEvent) => {
      const messageRemindStore = useMessageRemindStore()

      switch (event.type) {
        case 'Enter':
        case 'Move': {
          if (!messageRemindStore.shouldBlink) break
          if (useSessionLockStore().locked) break

          const rect = toTrayRect(event.rect)
          messageRemindStore.cancelHideWindow()
          void messageRemindStore.showNearTray(rect)
          void emit(MESSAGE_REMIND_SHOW_EVENT, rect)
          break
        }
        case 'Leave': {
          messageRemindStore.scheduleHideWindow()
          break
        }
        case 'Click': {
          if (event.button === 'Left') {
            void openMainWindow()
            break
          }
          if (event.button === 'Right') {
            void syncTrayMenuLoggedIn().then(() => showTrayMenuWindow(event))
          }
          break
        }
      }
    },
    icon: (await defaultWindowIcon()) || ''
  }
  await TrayIcon.new(options)
}
