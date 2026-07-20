import { resolveResource } from '@tauri-apps/api/path'
import { startDrag, type CallbackPayload } from '@crabnebula/tauri-plugin-drag'
import { exists } from '@tauri-apps/plugin-fs'
import { resolveFileIconName, type FileIconName } from '@/utils/file/fileIcon'

const dragIconPathCache = new Map<FileIconName, string>()
const preparedDragCache = new Map<string, string>()

const resolveDragIconPath = (fileName: string, fileType?: string) => {
  const iconName = resolveFileIconName(fileName, fileType)
  const cached = dragIconPathCache.get(iconName)
  if (cached) return Promise.resolve(cached)

  return resolveResource(`file-icons/${iconName}.png`)
    .catch(() => resolveResource('file-icons/file.png'))
    .then((iconPath) => {
      dragIconPathCache.set(iconName, iconPath)
      return iconPath
    })
}

/** 预加载拖拽所需图标，避免 mousedown 时异步过慢导致原生拖拽失败 */
export const prepareLocalFileDrag = (options: { filePath: string; fileName: string; fileType?: string }) => {
  const { filePath, fileName, fileType } = options
  if (preparedDragCache.has(filePath)) return Promise.resolve()

  return exists(filePath)
    .then((fileExists) => {
      if (!fileExists) {
        preparedDragCache.delete(filePath)
        return
      }
      return resolveDragIconPath(fileName, fileType).then((iconPath) => {
        preparedDragCache.set(filePath, iconPath)
      })
    })
    .catch(() => {
      preparedDragCache.delete(filePath)
    })
}

/** 将本地文件拖出窗口，可保存到资源管理器拖拽目标位置（需在 mousedown 时同步调用） */
export const startLocalFileDrag = (
  options: {
    filePath: string
    fileName: string
    fileType?: string
  },
  onEvent?: (payload: CallbackPayload) => void
) => {
  const { filePath, fileName, fileType } = options
  const cachedIcon = preparedDragCache.get(filePath)

  const launch = (iconPath: string) =>
    startDrag(
      {
        item: [filePath],
        icon: iconPath,
        mode: 'copy'
      },
      onEvent
    )

  if (cachedIcon) return launch(cachedIcon)

  return exists(filePath)
    .then((fileExists) => {
      if (!fileExists) {
        throw new Error(`file not found: ${filePath}`)
      }
      return resolveDragIconPath(fileName, fileType)
    })
    .then((iconPath) => {
      preparedDragCache.set(filePath, iconPath)
      return launch(iconPath)
    })
}
