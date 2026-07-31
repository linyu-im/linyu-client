import type { SpaceDownloadStatus } from '@/db/spaceDownload'
import { defineStore } from 'pinia'

export interface SpaceDownloadTask {
  id: string
  userId: string
  spaceFileId: string
  fileName: string
  downloadUrl: string
  savePath: string
  sourcePath: string
  fileSize: number
  loadedBytes: number
  status: SpaceDownloadStatus
  progress: number
  errorMsg: string
  speedBps: number
  createdAt: string
  updatedAt: string
  completedAt: string
}

type SpaceDownloadStore = {
  tasks: SpaceDownloadTask[]
  initializedUserId: string
}

const RECORD_KEEP_DAYS = 30

export const SPACE_DOWNLOAD_RECORD_KEEP_DAYS = RECORD_KEEP_DAYS

const toTask = (
  partial: Partial<SpaceDownloadTask> &
    Pick<
      SpaceDownloadTask,
      | 'id'
      | 'userId'
      | 'spaceFileId'
      | 'fileName'
      | 'downloadUrl'
      | 'savePath'
      | 'sourcePath'
      | 'fileSize'
      | 'status'
      | 'createdAt'
      | 'updatedAt'
    >
): SpaceDownloadTask => ({
  loadedBytes: 0,
  progress: 0,
  errorMsg: '',
  speedBps: 0,
  completedAt: '',
  ...partial
})

export const useSpaceDownloadStore = defineStore('spaceDownload', {
  // 任务落库 SQLite，此处不持久化运行时列表
  persist: {
    pick: []
  },
  share: {
    enable: true,
    initialize: true,
    omit: ['tasks', 'initializedUserId']
  },
  state: (): SpaceDownloadStore => ({
    tasks: [],
    initializedUserId: ''
  }),
  actions: {
    setInitializedUserId(userId: string) {
      this.$patch((state) => {
        state.initializedUserId = userId
      })
    },
    setTasks(tasks: SpaceDownloadTask[]) {
      this.$patch((state) => {
        state.tasks = tasks
      })
    },
    upsertTask(task: SpaceDownloadTask) {
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
    patchTask(id: string, patch: Partial<SpaceDownloadTask>) {
      this.$patch((state) => {
        const index = state.tasks.findIndex((item) => item.id === id)
        if (index < 0) return
        const prev = state.tasks[index]
        // 原地合并，避免每次进度都新建整段 tasks 数组导致大列表重渲染
        Object.assign(prev, patch)
      })
    },
    removeTask(id: string) {
      this.$patch((state) => {
        state.tasks = state.tasks.filter((item) => item.id !== id)
      })
    },
    removeTasksByStatus(statuses: SpaceDownloadStatus[]) {
      const set = new Set(statuses)
      this.$patch((state) => {
        state.tasks = state.tasks.filter((item) => !set.has(item.status))
      })
    }
  }
})
