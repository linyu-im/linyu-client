import { DEFAULT_SPACE_DOWNLOAD_PATH } from '@/constants/space'
import type { SpaceUploadStatus } from '@/db/spaceUpload'
import { defineStore } from 'pinia'

export interface SpaceUploadTask {
  id: string
  userId: string
  fileName: string
  filePath: string
  fileSize: number
  fileHash: string
  parentId: string
  parentPath: string
  status: SpaceUploadStatus
  progress: number
  errorMsg: string
  speedBps: number
  instantUpload: boolean
  createdAt: string
  updatedAt: string
  completedAt: string
}

type SpaceUploadStore = {
  tasks: SpaceUploadTask[]
  uploadParallel: number
  downloadParallel: number
  downloadPath: string
  useDefaultDownloadPath: boolean
  /** 上传完成计数，供文件列表刷新监听 */
  completedVersion: number
  initializedUserId: string
  transferDrawerVisible: boolean
  transferActiveTab: 'uploading' | 'downloading' | 'completed'
}

/** 默认并行数 */
export const DEFAULT_TRANSFER_PARALLEL = 3
/** 最大并行数 */
export const MAX_TRANSFER_PARALLEL = 6

const RECORD_KEEP_DAYS = 30

export const SPACE_UPLOAD_RECORD_KEEP_DAYS = RECORD_KEEP_DAYS

/** 规范化并行数，限制在 1~6 */
export const normalizeTransferParallel = (value: unknown): number => {
  if (value == null || value === '') return DEFAULT_TRANSFER_PARALLEL
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return DEFAULT_TRANSFER_PARALLEL
  return Math.min(MAX_TRANSFER_PARALLEL, Math.max(1, n))
}

const toTask = (
  partial: Partial<SpaceUploadTask> &
    Pick<
      SpaceUploadTask,
      | 'id'
      | 'userId'
      | 'fileName'
      | 'filePath'
      | 'fileSize'
      | 'parentId'
      | 'parentPath'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
    >
): SpaceUploadTask => ({
  fileHash: '',
  progress: 0,
  errorMsg: '',
  speedBps: 0,
  instantUpload: false,
  completedAt: '',
  ...partial
})

export const useSpaceUploadStore = defineStore('spaceUpload', {
  persist: {
    pick: ['uploadParallel', 'downloadParallel', 'downloadPath', 'useDefaultDownloadPath']
  },
  share: {
    enable: true,
    initialize: true,
    // 高频进度字段不同步，避免 BroadcastChannel 序列化卡死主线程
    omit: ['tasks', 'completedVersion', 'initializedUserId', 'transferActiveTab']
  },
  state: (): SpaceUploadStore => ({
    tasks: [],
    uploadParallel: DEFAULT_TRANSFER_PARALLEL,
    downloadParallel: DEFAULT_TRANSFER_PARALLEL,
    downloadPath: '',
    useDefaultDownloadPath: true,
    completedVersion: 0,
    initializedUserId: '',
    transferDrawerVisible: false,
    transferActiveTab: 'uploading'
  }),
  actions: {
    getUploadParallelLimit() {
      return normalizeTransferParallel(this.uploadParallel)
    },
    getDownloadParallelLimit() {
      return normalizeTransferParallel(this.downloadParallel)
    },
    /** 生效中的下载目录（空路径时回落到默认） */
    getEffectiveDownloadPath() {
      const path = (this.downloadPath || '').trim()
      if (path) return path.replace(/\\/g, '/')
      return DEFAULT_SPACE_DOWNLOAD_PATH
    },
    setTransferDrawerVisible(visible: boolean) {
      this.$patch((state) => {
        state.transferDrawerVisible = visible
      })
    },
    setTransferActiveTab(tab: 'uploading' | 'downloading' | 'completed') {
      this.$patch((state) => {
        state.transferActiveTab = tab
      })
    },
    setUploadParallel(value: number) {
      this.$patch((state) => {
        state.uploadParallel = normalizeTransferParallel(value)
      })
    },
    setDownloadParallel(value: number) {
      this.$patch((state) => {
        state.downloadParallel = normalizeTransferParallel(value)
      })
    },
    setDownloadPath(path: string) {
      this.$patch((state) => {
        state.downloadPath = path
      })
    },
    setUseDefaultDownloadPath(value: boolean) {
      this.$patch((state) => {
        state.useDefaultDownloadPath = value
      })
    },
    setInitializedUserId(userId: string) {
      this.$patch((state) => {
        state.initializedUserId = userId
      })
    },
    setTasks(tasks: SpaceUploadTask[]) {
      this.$patch((state) => {
        state.tasks = tasks
      })
    },
    upsertTask(task: SpaceUploadTask) {
      this.$patch((state) => {
        const index = state.tasks.findIndex((item) => item.id === task.id)
        if (index >= 0) {
          state.tasks[index] = { ...state.tasks[index], ...task }
        } else {
          state.tasks = [task, ...state.tasks]
        }
      })
    },
    addTask(partial: Parameters<typeof toTask>[0]) {
      const task = toTask(partial)
      this.upsertTask(task)
      return task
    },
    patchTask(id: string, patch: Partial<SpaceUploadTask>) {
      this.$patch((state) => {
        const index = state.tasks.findIndex((item) => item.id === id)
        if (index < 0) return
        state.tasks[index] = { ...state.tasks[index], ...patch }
      })
    },
    removeTask(id: string) {
      this.$patch((state) => {
        state.tasks = state.tasks.filter((item) => item.id !== id)
      })
    },
    removeTasksByStatus(statuses: SpaceUploadStatus[]) {
      const set = new Set(statuses)
      this.$patch((state) => {
        state.tasks = state.tasks.filter((item) => !set.has(item.status))
      })
    },
    bumpCompletedVersion() {
      this.$patch((state) => {
        state.completedVersion += 1
      })
    }
  }
})
