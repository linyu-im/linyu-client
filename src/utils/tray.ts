import { defaultWindowIcon } from '@tauri-apps/api/app'
import { TrayIcon, TrayIconEvent, TrayIconOptions } from '@tauri-apps/api/tray'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getAllWindows, PhysicalPosition } from '@tauri-apps/api/window'

export const setTrayEvent = async () => {
  const trayWindow = await WebviewWindow.getByLabel('tray')
  if (trayWindow) {
    await trayWindow.listen('tauri://blur', async () => {
      trayWindow.hide()
    })
  }
}

export const initSystemTray = async () => {
  const tray = await TrayIcon.getById('tray')
  if (tray) {
    return
  }
  const options: TrayIconOptions = {
    id: 'tray',
    tooltip: 'linyu',
    action: async (event: TrayIconEvent) => {
      switch (event.type) {
        case 'Click': {
          if (event.button === 'Left') {
            const windows = await getAllWindows()
            for (const window of windows) {
              if (window.label === 'home' || window.label === 'login') {
                await window.show()
                await window.unmaximize()
                await window.setFocus()
              }
            }
            break
          }
          if (event.button === 'Right') {
            const trayWindow = await WebviewWindow.getByLabel('tray')
            if (trayWindow) {
              const outerSize = await trayWindow.outerSize()
              await trayWindow.setPosition(
                new PhysicalPosition(event.rect.position.x, event.rect.position.y - outerSize.height)
              )
              await trayWindow.show()
              await trayWindow.unmaximize()
              await trayWindow.setFocus()
            } else {
              console.log('tray window not found')
            }
          }
          break
        }
      }
    },
    icon: (await defaultWindowIcon()) || ''
  }
  await TrayIcon.new(options)
}
