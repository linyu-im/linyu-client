import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { AppVersionCheckResult } from '@/types/api/appVersion'
import { checkAppVersion } from '@/utils/app/version'

export type AppUpdateStage = 'idle' | 'checking' | 'downloading' | 'ready' | 'installing' | 'error'

type AppUpdateStore = {
  checkResult: AppVersionCheckResult | null
  needForce: boolean
  needUpdate: boolean
  stage: AppUpdateStage
  progress: number
  installerPath: string
  errorMsg: string
  checking: boolean
}

const PROGRESS_EVENT = 'app-update-progress'

let progressUnlisten: UnlistenFn | undefined
let downloadPromise: Promise<string> | null = null
let silentDownload = false

export const useAppUpdateStore = defineStore('appUpdate', {
  persist: {
    // 不持久化 needForce/needUpdate，避免登录后被旧缓存或延迟 hydrate 覆盖
    pick: ['installerPath']
  },
  share: { enable: true, initialize: true },
  state: (): AppUpdateStore => ({
    checkResult: null,
    needForce: false,
    needUpdate: false,
    stage: 'idle',
    progress: 0,
    installerPath: '',
    errorMsg: '',
    checking: false
  }),
  actions: {
    resetDownloadState() {
      this.$patch((state) => {
        state.stage = 'idle'
        state.progress = 0
        state.installerPath = ''
        state.errorMsg = ''
      })
      downloadPromise = null
    },
    applyCheckResult(info: { data: AppVersionCheckResult; needForce: boolean; needUpdate: boolean }) {
      const sameTarget =
        this.checkResult?.latestVersionCode === info.data.latestVersionCode &&
        this.checkResult?.downloadUrl === info.data.downloadUrl
      this.$patch((state) => {
        state.checkResult = info.data
        state.needForce = info.needForce
        state.needUpdate = info.needUpdate
        if (!info.needUpdate) {
          state.stage = 'idle'
          state.progress = 0
          state.installerPath = ''
          state.errorMsg = ''
        } else if (sameTarget && state.installerPath) {
          state.stage = 'ready'
          state.progress = 1
        } else if (!sameTarget) {
          state.stage = 'idle'
          state.progress = 0
          state.installerPath = ''
          state.errorMsg = ''
        }
      })
      if (!sameTarget || !info.needUpdate) {
        downloadPromise = null
      }
    },
    check(options?: { silent?: boolean }) {
      this.$patch((state) => {
        state.checking = true
        if (!options?.silent) {
          state.stage = 'checking'
          state.errorMsg = ''
        }
      })
      return checkAppVersion()
        .then((info) => {
          this.applyCheckResult(info)
          if (!info.needUpdate && !info.needForce) {
            this.$patch((state) => {
              state.stage = 'idle'
              state.progress = 0
              state.installerPath = ''
            })
          }
          return info
        })
        .catch((error: Error) => {
          this.$patch((state) => {
            state.errorMsg = error.message
            if (!options?.silent) {
              state.stage = 'error'
            }
          })
          return Promise.reject(error)
        })
        .finally(() => {
          this.$patch((state) => {
            state.checking = false
            if (state.stage === 'checking') {
              state.stage = 'idle'
            }
          })
        })
    },
    ensureProgressListener() {
      if (progressUnlisten) return Promise.resolve()
      return listen<{
        stage: string
        progress: number
        path?: string
        message?: string
      }>(PROGRESS_EVENT, (event) => {
        const payload = event.payload
        this.$patch((state) => {
          if (payload.stage === 'downloading') {
            // 静默下载只写进度，不切换到会展示在弹窗里的 downloading 文案态之外的异常态
            if (!silentDownload) {
              state.stage = 'downloading'
            } else if (state.stage === 'idle' || state.stage === 'downloading') {
              state.stage = 'downloading'
            }
            state.progress = payload.progress
          } else if (payload.stage === 'done') {
            state.stage = 'ready'
            state.progress = 1
            if (payload.path) {
              state.installerPath = payload.path
            }
          } else if (payload.stage === 'error') {
            if (silentDownload) {
              state.stage = 'idle'
              state.progress = 0
              state.errorMsg = ''
              return
            }
            state.stage = 'error'
            state.errorMsg = payload.message || state.errorMsg
          }
        })
      }).then((unlisten) => {
        progressUnlisten = unlisten
      })
    },
    startDownload(options?: { silent?: boolean }) {
      const result = this.checkResult
      if (!result?.downloadUrl) {
        return Promise.reject(new Error('missing download url'))
      }
      if (this.stage === 'ready' && this.installerPath) {
        return Promise.resolve(this.installerPath)
      }
      if (downloadPromise) {
        return downloadPromise
      }

      this.$patch((state) => {
        state.stage = 'downloading'
        state.progress = 0
        state.errorMsg = ''
      })

      silentDownload = !!options?.silent
      downloadPromise = this.ensureProgressListener()
        .then(() =>
          invoke<string>('download_app_update', {
            url: result.downloadUrl,
            version: result.latestVersion
          })
        )
        .then((path) => {
          silentDownload = false
          this.$patch((state) => {
            state.stage = 'ready'
            state.progress = 1
            state.installerPath = path
          })
          return path
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error)
          console.error('[AppUpdate] download failed:', message)
          const wasSilent = silentDownload || message.includes('APP_UPDATE_CANCELLED')
          silentDownload = false
          if (wasSilent) {
            // 静默下载 / 取消：不污染弹窗，保留 needUpdate 红点
            this.$patch((state) => {
              state.stage = 'idle'
              state.progress = 0
              state.errorMsg = ''
            })
          } else {
            this.$patch((state) => {
              state.stage = 'error'
              state.errorMsg = message
            })
          }
          downloadPromise = null
          return Promise.reject(error)
        })

      return downloadPromise
    },
    cancelDownload() {
      return invoke('cancel_app_update_download').then(() => {
        downloadPromise = null
        silentDownload = false
        this.$patch((state) => {
          state.stage = 'idle'
          state.progress = 0
          state.errorMsg = ''
        })
      })
    },
    install() {
      const runInstall = (path: string) => {
        this.$patch((state) => {
          state.stage = 'installing'
          state.progress = 1
          state.errorMsg = ''
        })
        return invoke('install_app_update', { path }).catch((error: Error) => {
          this.$patch((state) => {
            state.stage = 'error'
            state.errorMsg = error?.message || String(error)
          })
          return Promise.reject(error)
        })
      }

      if (this.installerPath && this.stage === 'ready') {
        return runInstall(this.installerPath)
      }

      return this.startDownload().then((path) => runInstall(path))
    },
    updateNow() {
      return this.install()
    }
  }
})
