import {
  deleteCompletedSpaceUploads,
  deleteExpiredCompletedSpaceUploads,
  deleteSpaceUploadById,
  insertSpaceUpload,
  markInterruptedUploadsAsPaused,
  querySpaceUploadsByUser,
  updateSpaceUpload,
  type DbSpaceUpload,
  type SpaceUploadStatus
} from '@/db/spaceUpload'
import {
  SPACE_UPLOAD_RECORD_KEEP_DAYS,
  useSpaceUploadStore,
  type SpaceUploadTask
} from '@/stores/cloudDrive/spaceUpload'
import { useUserStore } from '@/stores/user/user'
import { normalizeFileSize, statFileSize } from '@/utils/file/filePick'
import {
  cancelSpaceFileUpload,
  checkSpaceFileUpload,
  computeSpaceFileHash,
  isUploadCancelledError,
  uploadSpaceFileChunks
} from '@/utils/file/spaceFileUpload'
import { exists } from '@tauri-apps/plugin-fs'

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

const RUNNING_STATUSES: SpaceUploadStatus[] = ['hashing', 'checking', 'uploading']
/** 进度 UI / Pinia 更新节流，防止大文件分片回调打满主线程 */
const PROGRESS_UI_INTERVAL_MS = 250

const nowIso = () => new Date().toISOString()

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `space-upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const dbToTask = (row: DbSpaceUpload): SpaceUploadTask => ({
  id: row.id,
  userId: row.userId,
  fileName: row.fileName,
  filePath: row.filePath,
  fileSize: normalizeFileSize(row.fileSize),
  fileHash: row.fileHash || '',
  parentId: row.parentId,
  parentPath: row.parentPath,
  status: row.status,
  progress: Math.min(100, Math.max(0, Math.round(Number(row.progress) || 0))),
  errorMsg: row.errorMsg || '',
  speedBps: 0,
  instantUpload: false,
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

const persistTask = (taskId: string, patch: Parameters<typeof updateSpaceUpload>[1]) => {
  return updateSpaceUpload(taskId, patch).catch(() => {})
}

const patchAndPersist = (
  taskId: string,
  patch: Partial<SpaceUploadTask>,
  dbPatch?: Parameters<typeof updateSpaceUpload>[1]
) => {
  const store = useSpaceUploadStore()
  const updatedAt = patch.updatedAt || nowIso()
  store.patchTask(taskId, { ...patch, updatedAt })
  return persistTask(taskId, {
    updatedAt,
    status: patch.status,
    progress: patch.progress,
    fileHash: patch.fileHash,
    fileSize: patch.fileSize !== undefined ? normalizeFileSize(patch.fileSize) : undefined,
    errorMsg: patch.errorMsg === undefined ? undefined : patch.errorMsg || null,
    completedAt: patch.completedAt === undefined ? undefined : patch.completedAt || null,
    ...dbPatch
  })
}

const updateProgressWithSpeed = (taskId: string, progress: number, fileSize: number) => {
  const store = useSpaceUploadStore()
  const control = ensureControl(taskId)
  const now = Date.now()
  const loadedBytes = Math.floor((fileSize * progress) / 100)
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

  store.patchTask(taskId, {
    progress,
    speedBps,
    updatedAt: nowIso()
  })

  // 进度写库节流：每 5% 或完成时落库
  if (progress >= 100 || progress % 5 === 0) {
    void persistTask(taskId, { progress, updatedAt: nowIso() })
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

const runTask = (taskId: string) => {
  if (runningTaskIds.has(taskId)) return
  runningTaskIds.add(taskId)

  const store = useSpaceUploadStore()
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
  control.lastLoadedBytes = 0
  control.lastUiProgressAt = 0
  control.lastUiProgress = -1

  const finishRunning = () => {
    runningTaskIds.delete(taskId)
    schedulePump()
  }

  const abortIfRequested = () => {
    if (control.cancelRequested) {
      clearControl(taskId)
      void patchAndPersist(taskId, {
        status: 'cancelled',
        speedBps: 0,
        completedAt: nowIso(),
        errorMsg: ''
      })
      finishRunning()
      return true
    }
    if (control.pauseRequested) {
      void patchAndPersist(taskId, {
        status: 'paused',
        speedBps: 0,
        errorMsg: ''
      })
      finishRunning()
      return true
    }
    return false
  }

  exists(task.filePath)
    .then((ok) => {
      if (!ok) {
        throw new Error('FILE_MISSING')
      }
      if (abortIfRequested()) return null

      // 以磁盘真实大小为准，避免选文件缓存/SQLite 读回 string/0 触发后端 fileSize 校验失败
      return statFileSize(task.filePath).then((fileSize) => {
        if (fileSize <= 0) {
          throw new Error('INVALID_FILE_SIZE')
        }
        return patchAndPersist(taskId, {
          status: 'hashing',
          fileSize,
          errorMsg: '',
          speedBps: 0
        }).then(() => {
          const latest = store.tasks.find((item) => item.id === taskId)
          if (latest?.fileHash) return latest.fileHash
          return computeSpaceFileHash(task.filePath)
        })
      })
    })
    .then((fileHash) => {
      if (fileHash === null) return null
      if (abortIfRequested()) return null

      const latest = store.tasks.find((item) => item.id === taskId) || task
      const fileSize = normalizeFileSize(latest.fileSize)
      if (fileSize <= 0) {
        throw new Error('INVALID_FILE_SIZE')
      }

      return patchAndPersist(taskId, {
        status: 'checking',
        fileHash,
        fileSize,
        errorMsg: ''
      }).then(() =>
        checkSpaceFileUpload({
          fileHash,
          fileSize,
          fileName: latest.fileName,
          parentId: latest.parentId
        })
      )
    })
    .then((outcome) => {
      if (!outcome) return null
      if (abortIfRequested()) return null

      const latest = store.tasks.find((item) => item.id === taskId) || task
      const fileSize = normalizeFileSize(latest.fileSize)

      if (outcome.uploaded) {
        return patchAndPersist(taskId, {
          status: 'completed',
          progress: 100,
          speedBps: 0,
          fileHash: outcome.fileHash,
          completedAt: nowIso(),
          errorMsg: '',
          instantUpload: true
        }).then(() => {
          clearControl(taskId)
          store.bumpCompletedVersion()
          finishRunning()
          return 'done' as const
        })
      }

      return patchAndPersist(taskId, {
        status: 'uploading',
        fileHash: outcome.fileHash,
        errorMsg: ''
      }).then(() =>
        uploadSpaceFileChunks({
          filePath: latest.filePath,
          fileName: latest.fileName,
          fileSize,
          parentId: latest.parentId,
          fileHash: outcome.fileHash,
          taskId,
          skipChunks: outcome.skipChunks,
          onProgress: (progress) => {
            updateProgressWithSpeed(taskId, progress, fileSize)
          },
          onError: (message) => {
            store.patchTask(taskId, { errorMsg: message })
          }
        }).then((result) => {
          if (result === null) {
            throw new Error(store.tasks.find((item) => item.id === taskId)?.errorMsg || 'UPLOAD_FAILED')
          }
          return patchAndPersist(taskId, {
            status: 'completed',
            progress: 100,
            speedBps: 0,
            completedAt: nowIso(),
            errorMsg: ''
          }).then(() => {
            clearControl(taskId)
            store.bumpCompletedVersion()
            finishRunning()
            return 'done' as const
          })
        })
      )
    })
    .catch((err: unknown) => {
      if (isUploadCancelledError(err) || control.pauseRequested || control.cancelRequested) {
        if (control.cancelRequested) {
          clearControl(taskId)
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
      const message =
        rawMessage === 'FILE_MISSING'
          ? 'file missing'
          : rawMessage === 'INVALID_FILE_SIZE'
            ? 'invalid file size'
            : rawMessage === 'CHECK_FAILED'
              ? 'check upload failed'
              : rawMessage

      void patchAndPersist(taskId, {
        status: 'failed',
        speedBps: 0,
        errorMsg: message
      })
      finishRunning()
    })
}

const pumpQueue = () => {
  const store = useSpaceUploadStore()
  const limit = store.getUploadParallelLimit()
  const runningCount = store.tasks.filter((item) => RUNNING_STATUSES.includes(item.status)).length
  const available = Math.max(0, limit - runningCount)
  if (available <= 0) return

  const queued = store.tasks
    .filter((item) => item.status === 'pending' && !runningTaskIds.has(item.id))
    .slice()
    // 按创建时间升序排队，先来先传
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, available)

  for (const task of queued) {
    runTask(task.id)
  }
}

export const refreshSpaceUploadQueue = () => {
  schedulePump()
}

export interface EnqueueSpaceUploadFile {
  filePath: string
  fileName: string
  fileSize: number
}

export interface EnqueueSpaceUploadOptions {
  parentId: string
  parentPath: string
  files: EnqueueSpaceUploadFile[]
}

export const initSpaceUploadManager = (userId?: string) => {
  const uid = userId || getCurrentUserId()
  if (!uid) {
    const store = useSpaceUploadStore()
    store.setInitializedUserId('')
    store.setTasks([])
    runningTaskIds.clear()
    runtimeControls.clear()
    return Promise.resolve()
  }

  const store = useSpaceUploadStore()
  if (store.initializedUserId === uid) {
    schedulePump()
    return Promise.resolve()
  }

  if (store.initializedUserId && store.initializedUserId !== uid) {
    runningTaskIds.clear()
    runtimeControls.clear()
  }

  const updatedAt = nowIso()
  const keepBefore = new Date(Date.now() - SPACE_UPLOAD_RECORD_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString()

  return markInterruptedUploadsAsPaused(uid, updatedAt)
    .then(() => deleteExpiredCompletedSpaceUploads(uid, keepBefore))
    .then(() => querySpaceUploadsByUser(uid))
    .then((rows) => {
      store.setTasks(rows.map(dbToTask))
      store.setInitializedUserId(uid)
      schedulePump()
    })
    .catch(() => {})
}

export const enqueueSpaceUploads = (options: EnqueueSpaceUploadOptions) => {
  const userId = getCurrentUserId()
  if (!userId) return Promise.resolve([])

  const store = useSpaceUploadStore()
  const createdAt = nowIso()
  const tasks: SpaceUploadTask[] = []

  const chain = options.files.reduce((prev, file) => {
    return prev.then(() => {
      const fileSize = normalizeFileSize(file.fileSize)
      if (fileSize <= 0) {
        return undefined
      }
      const id = createId()
      const task = store.addTask({
        id,
        userId,
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize,
        parentId: options.parentId,
        parentPath: options.parentPath,
        status: 'pending',
        progress: 0,
        createdAt,
        updatedAt: createdAt
      })
      tasks.push(task)
      return insertSpaceUpload({
        id,
        userId,
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize,
        parentId: options.parentId,
        parentPath: options.parentPath,
        status: 'pending',
        progress: 0,
        createdAt,
        updatedAt: createdAt
      })
    })
  }, Promise.resolve())

  return chain.then(() => {
    schedulePump()
    return tasks
  })
}

export const pauseSpaceUpload = (taskId: string) => {
  const store = useSpaceUploadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) return Promise.resolve()

  if (task.status === 'pending') {
    return patchAndPersist(taskId, { status: 'paused', speedBps: 0 })
  }

  if (!RUNNING_STATUSES.includes(task.status)) return Promise.resolve()

  const control = ensureControl(taskId)
  control.pauseRequested = true
  control.cancelRequested = false
  return cancelSpaceFileUpload(taskId).then(() => undefined)
}

export const resumeSpaceUpload = (taskId: string) => {
  const store = useSpaceUploadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) return Promise.resolve()
  if (!['paused', 'failed'].includes(task.status)) return Promise.resolve()

  return patchAndPersist(taskId, {
    status: 'pending',
    errorMsg: '',
    speedBps: 0
  }).then(() => {
    // 直接启动，不受“仅 pending 自动队列”等待影响
    const control = ensureControl(taskId)
    control.pauseRequested = false
    control.cancelRequested = false
    runTask(taskId)
  })
}

export const cancelSpaceUpload = (taskId: string) => {
  const store = useSpaceUploadStore()
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task) return Promise.resolve()

  if (RUNNING_STATUSES.includes(task.status)) {
    const control = ensureControl(taskId)
    control.cancelRequested = true
    control.pauseRequested = false
    return cancelSpaceFileUpload(taskId).then(() => undefined)
  }

  clearControl(taskId)
  return patchAndPersist(taskId, {
    status: 'cancelled',
    speedBps: 0,
    completedAt: nowIso(),
    errorMsg: ''
  })
}

export const pauseAllSpaceUploads = () => {
  const store = useSpaceUploadStore()
  const targets = store.tasks.filter((item) => item.status === 'pending' || RUNNING_STATUSES.includes(item.status))
  return Promise.all(targets.map((item) => pauseSpaceUpload(item.id))).then(() => undefined)
}

export const clearCompletedSpaceUploads = () => {
  const userId = getCurrentUserId()
  if (!userId) return Promise.resolve()
  const store = useSpaceUploadStore()
  store.removeTasksByStatus(['completed', 'cancelled'])
  return deleteCompletedSpaceUploads(userId).catch(() => {})
}

export const removeSpaceUploadRecord = (taskId: string) => {
  const store = useSpaceUploadStore()
  store.removeTask(taskId)
  clearControl(taskId)
  return deleteSpaceUploadById(taskId).catch(() => {})
}
