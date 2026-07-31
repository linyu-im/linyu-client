import {
  deleteCompletedSpaceDownloads,
  deleteExpiredCompletedSpaceDownloads,
  deleteSpaceDownloadById,
  insertSpaceDownload,
  markInterruptedDownloadsAsPaused,
  querySpaceDownloadsByUser,
  updateSpaceDownload,
  type DbSpaceDownload,
  type SpaceDownloadStatus
} from '@/db/spaceDownload'
import {
  SPACE_DOWNLOAD_RECORD_KEEP_DAYS,
  useSpaceDownloadStore,
  type SpaceDownloadTask
} from '@/stores/cloudDrive/spaceDownload'
import { useSpaceUploadStore } from '@/stores/cloudDrive/spaceUpload'
import { useUserStore } from '@/stores/user/user'
import { normalizeFileSize } from '@/utils/file/filePick'
import { cancelSpaceFileDownload, downloadSpaceFile, isDownloadCancelledError } from '@/utils/file/spaceFileDownload'
import { join } from '@tauri-apps/api/path'
import { exists, mkdir, remove } from '@tauri-apps/plugin-fs'

type RuntimeControl = {
  pauseRequested: boolean
  cancelRequested: boolean
  lastProgressAt: number
  lastLoadedBytes: number
  lastUiProgressAt: number
  lastUiProgress: number
}

const runtimeControls = new Map<string, RuntimeControl>()
const runningTaskIds = new Set<string>()
let pumpScheduled = false

const RUNNING_STATUSES: SpaceDownloadStatus[] = ['downloading']
const PROGRESS_UI_INTERVAL_MS = 300

const nowIso = () => new Date().toISOString()

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `space-download-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const dbToTask = (row: DbSpaceDownload): SpaceDownloadTask => ({
  id: row.id,
  userId: row.userId,
  spaceFileId: row.spaceFileId,
  fileName: row.fileName,
  downloadUrl: row.downloadUrl,
  savePath: row.savePath,
  sourcePath: row.sourcePath,
  fileSize: normalizeFileSize(row.fileSize),
  loadedBytes: Math.max(0, Number(row.loadedBytes) || 0),
  status: row.status,
  progress: Math.min(100, Math.max(0, Math.round(Number(row.progress) || 0))),
  errorMsg: row.errorMsg || '',
  speedBps: 0,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  completedAt: row.completedAt || ''
})

const ensureControl = (taskId: string): RuntimeControl => {
  let control = runtimeControls.get(taskId)
  if (!control) {
    control = {
      pauseRequested: false,
      cancelRequested: false,
      lastProgressAt: 0,
      lastLoadedBytes: 0,
      lastUiProgressAt: 0,
      lastUiProgress: -1
    }
    runtimeControls.set(taskId, control)
  }
  return control
}

const clearControl = (taskId: string) => {
  runtimeControls.delete(taskId)
}

const persistTask = (taskId: string, patch: Parameters<typeof updateSpaceDownload>[1]) => {
  return updateSpaceDownload(taskId, patch).catch(() => {})
}

const patchAndPersist = (
  taskId: string,
  patch: Partial<SpaceDownloadTask>,
  dbPatch?: Parameters<typeof updateSpaceDownload>[1]
) => {
  const store = useSpaceDownloadStore()
  const updatedAt = patch.updatedAt || nowIso()
  store.patchTask(taskId, { ...patch, updatedAt })
  return persistTask(taskId, {
    updatedAt,
    status: patch.status,
    progress: patch.progress,
    fileSize: patch.fileSize !== undefined ? normalizeFileSize(patch.fileSize) : undefined,
    loadedBytes: patch.loadedBytes,
    savePath: patch.savePath,
    errorMsg: patch.errorMsg === undefined ? undefined : patch.errorMsg || null,
    completedAt: patch.completedAt === undefined ? undefined : patch.completedAt || null,
    ...dbPatch
  })
}

const updateProgressWithSpeed = (taskId: string, progress: number, loadedBytes: number, totalBytes: number) => {
  const store = useSpaceDownloadStore()
  const control = ensureControl(taskId)
  const now = Date.now()
  let speedBps = store.tasks.find((item) => item.id === taskId)?.speedBps || 0

  if (control.lastProgressAt > 0) {
    const dt = (now - control.lastProgressAt) / 1000
    if (dt > 0.2) {
      const delta = Math.max(0, loadedBytes - control.lastLoadedBytes)
      speedBps = delta / dt
      control.lastProgressAt = now
      control.lastLoadedBytes = loadedBytes
    }
  } else {
    control.lastProgressAt = now
    control.lastLoadedBytes = loadedBytes
  }

  const shouldFlushUi =
    progress >= 100 ||
    (progress !== control.lastUiProgress && now - control.lastUiProgressAt >= PROGRESS_UI_INTERVAL_MS)

  if (!shouldFlushUi) return

  control.lastUiProgressAt = now
  control.lastUiProgress = progress

  const fileSize = totalBytes > 0 ? totalBytes : store.tasks.find((item) => item.id === taskId)?.fileSize || 0
  const patch: Partial<SpaceDownloadTask> = {
    progress,
    loadedBytes,
    speedBps,
    updatedAt: nowIso()
  }
  if (fileSize > 0) patch.fileSize = fileSize

  store.patchTask(taskId, patch)

  if (progress >= 100 || progress % 5 === 0) {
    void persistTask(taskId, {
      progress,
      loadedBytes,
      fileSize: fileSize > 0 ? fileSize : undefined,
      updatedAt: nowIso()
    })
  }
}

const schedulePump = () => {
  if (pumpScheduled) return
  pumpScheduled = true
  Promise.resolve()
    .then(() => {
      pumpScheduled = false
      pumpQueue()
    })
    .catch(() => {
      pumpScheduled = false
    })
}

const getCurrentUserId = () => useUserStore().authInfo.userId || ''

const sanitizeFileName = (name: string) => {
  const cleaned = [...name]
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code <= 31 || '<>:"/\\|?*'.includes(char)) return '_'
      return char
    })
    .join('')
    .trim()
  return cleaned || 'download'
}

const resolveUniqueSavePath = (dir: string, fileName: string): Promise<string> => {
  const safeName = sanitizeFileName(fileName)
  const dot = safeName.lastIndexOf('.')
  const base = dot > 0 ? safeName.slice(0, dot) : safeName
  const ext = dot > 0 ? safeName.slice(dot) : ''

  const tryPath = (index: number): Promise<string> => {
    const name = index === 0 ? safeName : `${base} (${index})${ext}`
    return join(dir, name).then((path) => {
      const normalized = path.replace(/\\/g, '/')
      return exists(normalized).then((ok) => {
        if (!ok) {
          return exists(`${normalized}.part`).then((partOk) => {
            if (!partOk) return normalized
            return tryPath(index + 1)
          })
        }
        return tryPath(index + 1)
      })
    })
  }

  return tryPath(0)
}

const ensureDir = (dir: string) => mkdir(dir, { recursive: true }).catch(() => {})

const removePartFile = (savePath: string) => {
  const part = `${savePath}.part`
  return remove(part).catch(() => {})
}

const runTask = (taskId: string) => {
  if (runningTaskIds.has(taskId)) return
  runningTaskIds.add(taskId)

  const store = useSpaceDownloadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) {
    runningTaskIds.delete(taskId)
    schedulePump()
    return
  }

  const control = ensureControl(taskId)
  control.pauseRequested = false
  control.cancelRequested = false
  control.lastProgressAt = 0
  control.lastLoadedBytes = task.loadedBytes || 0
  control.lastUiProgressAt = 0
  control.lastUiProgress = -1

  const finishRunning = () => {
    runningTaskIds.delete(taskId)
    schedulePump()
  }

  if (!task.downloadUrl) {
    void patchAndPersist(taskId, {
      status: 'failed',
      speedBps: 0,
      errorMsg: 'EMPTY_DOWNLOAD_URL'
    })
    finishRunning()
    return
  }

  void patchAndPersist(taskId, {
    status: 'downloading',
    errorMsg: '',
    speedBps: 0
  })
    .then(() =>
      downloadSpaceFile({
        url: task.downloadUrl,
        savePath: task.savePath,
        taskId,
        onProgress: ({ progress, loadedBytes, totalBytes }) => {
          updateProgressWithSpeed(taskId, progress, loadedBytes, totalBytes)
        },
        onError: (message) => {
          store.patchTask(taskId, { errorMsg: message })
        }
      })
    )
    .then((result) => {
      if (result === null) {
        throw new Error(store.tasks.find((item) => item.id === taskId)?.errorMsg || 'DOWNLOAD_FAILED')
      }
      return patchAndPersist(taskId, {
        status: 'completed',
        progress: 100,
        speedBps: 0,
        loadedBytes: store.tasks.find((item) => item.id === taskId)?.fileSize || task.fileSize,
        completedAt: nowIso(),
        errorMsg: ''
      }).then(() => {
        clearControl(taskId)
        finishRunning()
      })
    })
    .catch((err: unknown) => {
      if (isDownloadCancelledError(err) || control.pauseRequested || control.cancelRequested) {
        if (control.cancelRequested) {
          clearControl(taskId)
          void removePartFile(task.savePath)
          void patchAndPersist(taskId, {
            status: 'cancelled',
            speedBps: 0,
            completedAt: nowIso(),
            errorMsg: ''
          })
        } else {
          void patchAndPersist(taskId, {
            status: 'paused',
            speedBps: 0,
            errorMsg: ''
          })
        }
        finishRunning()
        return
      }

      const rawMessage = err instanceof Error ? err.message : String(err)
      void patchAndPersist(taskId, {
        status: 'failed',
        speedBps: 0,
        errorMsg: rawMessage || 'DOWNLOAD_FAILED'
      })
      finishRunning()
    })
}

const pumpQueue = () => {
  const downloadStore = useSpaceDownloadStore()
  const uploadStore = useSpaceUploadStore()
  const limit = uploadStore.getDownloadParallelLimit()
  const runningCount = downloadStore.tasks.filter((item) => RUNNING_STATUSES.includes(item.status)).length
  const available = Math.max(0, limit - runningCount)
  if (available <= 0) return

  const queued = downloadStore.tasks
    .filter((item) => item.status === 'pending' && !runningTaskIds.has(item.id))
    .slice()
    // 按创建时间升序排队，先来先下
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, available)

  for (const task of queued) {
    runTask(task.id)
  }
}

export const refreshSpaceDownloadQueue = () => {
  schedulePump()
}

export interface EnqueueSpaceDownloadFile {
  spaceFileId: string
  fileName: string
  downloadUrl: string
  sourcePath: string
  fileSize: number
}

export interface EnqueueSpaceDownloadOptions {
  saveDir: string
  files: EnqueueSpaceDownloadFile[]
}

export const initSpaceDownloadManager = (userId?: string) => {
  const uid = userId || getCurrentUserId()
  if (!uid) {
    const store = useSpaceDownloadStore()
    store.setInitializedUserId('')
    store.setTasks([])
    runningTaskIds.clear()
    runtimeControls.clear()
    return Promise.resolve()
  }

  const store = useSpaceDownloadStore()
  if (store.initializedUserId === uid) {
    schedulePump()
    return Promise.resolve()
  }

  if (store.initializedUserId && store.initializedUserId !== uid) {
    runningTaskIds.clear()
    runtimeControls.clear()
  }

  const updatedAt = nowIso()
  const keepBefore = new Date(Date.now() - SPACE_DOWNLOAD_RECORD_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString()

  return markInterruptedDownloadsAsPaused(uid, updatedAt)
    .then(() => deleteExpiredCompletedSpaceDownloads(uid, keepBefore))
    .then(() => querySpaceDownloadsByUser(uid))
    .then((rows) => {
      store.setTasks(rows.map(dbToTask))
      store.setInitializedUserId(uid)
      schedulePump()
    })
    .catch(() => {})
}

export const enqueueSpaceDownloads = (options: EnqueueSpaceDownloadOptions) => {
  const userId = getCurrentUserId()
  if (!userId) return Promise.resolve([])

  const store = useSpaceDownloadStore()
  const createdAt = nowIso()
  const tasks: SpaceDownloadTask[] = []
  const saveDir = options.saveDir.trim().replace(/\\/g, '/')

  return ensureDir(saveDir)
    .then(() =>
      options.files.reduce((prev, file) => {
        return prev.then(() => {
          const downloadUrl = (file.downloadUrl || '').trim()
          if (!downloadUrl) return undefined

          return resolveUniqueSavePath(saveDir, file.fileName).then((savePath) => {
            const id = createId()
            const fileSize = normalizeFileSize(file.fileSize)
            const task = store.addTask({
              id,
              userId,
              spaceFileId: file.spaceFileId,
              fileName: file.fileName,
              downloadUrl,
              savePath,
              sourcePath: file.sourcePath || '',
              fileSize,
              status: 'pending',
              progress: 0,
              loadedBytes: 0,
              createdAt,
              updatedAt: createdAt
            })
            tasks.push(task)
            return insertSpaceDownload({
              id,
              userId,
              spaceFileId: file.spaceFileId,
              fileName: file.fileName,
              downloadUrl,
              savePath,
              sourcePath: file.sourcePath || '',
              fileSize,
              loadedBytes: 0,
              status: 'pending',
              progress: 0,
              createdAt,
              updatedAt: createdAt
            })
          })
        })
      }, Promise.resolve())
    )
    .then(() => {
      schedulePump()
      return tasks
    })
}

export const pauseSpaceDownload = (taskId: string) => {
  const store = useSpaceDownloadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) return Promise.resolve()

  if (task.status === 'pending') {
    return patchAndPersist(taskId, { status: 'paused', speedBps: 0 })
  }

  if (!RUNNING_STATUSES.includes(task.status)) return Promise.resolve()

  const control = ensureControl(taskId)
  control.pauseRequested = true
  control.cancelRequested = false
  return cancelSpaceFileDownload(taskId).then(() => undefined)
}

export const resumeSpaceDownload = (taskId: string) => {
  const store = useSpaceDownloadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) return Promise.resolve()
  if (!['paused', 'failed'].includes(task.status)) return Promise.resolve()

  return patchAndPersist(taskId, {
    status: 'pending',
    errorMsg: '',
    speedBps: 0
  }).then(() => {
    const control = ensureControl(taskId)
    control.pauseRequested = false
    control.cancelRequested = false
    runTask(taskId)
  })
}

export const cancelSpaceDownload = (taskId: string) => {
  const store = useSpaceDownloadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) return Promise.resolve()

  if (RUNNING_STATUSES.includes(task.status)) {
    const control = ensureControl(taskId)
    control.cancelRequested = true
    control.pauseRequested = false
    return cancelSpaceFileDownload(taskId).then(() => undefined)
  }

  clearControl(taskId)
  void removePartFile(task.savePath)
  return patchAndPersist(taskId, {
    status: 'cancelled',
    speedBps: 0,
    completedAt: nowIso(),
    errorMsg: ''
  })
}

export const pauseAllSpaceDownloads = () => {
  const store = useSpaceDownloadStore()
  const targets = store.tasks.filter((item) => item.status === 'pending' || RUNNING_STATUSES.includes(item.status))
  return Promise.all(targets.map((item) => pauseSpaceDownload(item.id))).then(() => undefined)
}

export const clearCompletedSpaceDownloads = () => {
  const userId = getCurrentUserId()
  if (!userId) return Promise.resolve()
  const store = useSpaceDownloadStore()
  store.removeTasksByStatus(['completed', 'cancelled'])
  return deleteCompletedSpaceDownloads(userId).catch(() => {})
}

export const removeSpaceDownloadRecord = (taskId: string) => {
  const store = useSpaceDownloadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  store.removeTask(taskId)
  clearControl(taskId)
  if (task) void removePartFile(task.savePath)
  return deleteSpaceDownloadById(taskId).catch(() => {})
}
