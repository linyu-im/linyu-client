import { defaultWindowIcon } from '@tauri-apps/api/app'
import { emit } from '@tauri-apps/api/event'
import { TrayIcon, TrayIconEvent, TrayIconOptions } from '@tauri-apps/api/tray'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getAllWindows, PhysicalPosition } from '@tauri-apps/api/window'
import { MESSAGE_REMIND_SHOW_EVENT } from '@/constants/event'
import { HOME_WINDOW_LABEL, LOGIN_WINDOW_LABEL, TRAY_WINDOW_LABEL } from '@/constants/window'
import { useMessageRemindStore, type MessageRemindTrayRect } from '@/stores/message/messageRemind'

export const TRAY_ID = 'tray'

const toTrayRect = (rect: TrayIconEvent['rect']): MessageRemindTrayRect => ({
  position: { x: rect.position.x, y: rect.position.y },
  size: { width: rect.size.width, height: rect.size.height }
})

export const setTrayEvent = async () => {
  const trayWindow = await WebviewWindow.getByLabel(TRAY_WINDOW_LABEL)
  if (trayWindow) {
    await trayWindow.listen('tauri://blur', async () => {
      trayWindow.hide()
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
            void getAllWindows().then((windows) => {
              for (const window of windows) {
                if (window.label === HOME_WINDOW_LABEL || window.label === LOGIN_WINDOW_LABEL) {
                  void window
                    .show()
                    .then(() => window.unminimize())
                    .then(() => window.setFocus())
                }
              }
            })
            break
          }
          if (event.button === 'Right') {
            void WebviewWindow.getByLabel(TRAY_WINDOW_LABEL).then((trayWindow) => {
              if (!trayWindow) {
                console.log('tray window not found')
                return
              }
              void trayWindow.outerSize().then((outerSize) => {
                const x = Math.round(event.rect.position.x)
                const y = Math.round(event.rect.position.y - outerSize.height)
                void trayWindow
                  .setPosition(new PhysicalPosition(x, y))
                  .then(() => trayWindow.show())
                  .then(() => trayWindow.unmaximize())
                  .then(() => trayWindow.setFocus())
              })
            })
          }
          break
        }
      }
    },
    icon: (await defaultWindowIcon()) || ''
  }
  await TrayIcon.new(options)
}
