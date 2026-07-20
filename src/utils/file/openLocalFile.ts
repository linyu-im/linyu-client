import { exists } from '@tauri-apps/plugin-fs'
import { openPath } from '@tauri-apps/plugin-opener'

/** 使用系统默认程序打开本地文件 */
export const openLocalFile = (filePath: string) =>
  exists(filePath).then((fileExists) => {
    if (!fileExists) {
      throw new Error(`file not found: ${filePath}`)
    }
    return openPath(filePath)
  })
