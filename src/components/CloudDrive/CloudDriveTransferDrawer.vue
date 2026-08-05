<template>
  <n-drawer
    :show="show"
    :width="drawerWidth"
    placement="right"
    :trap-focus="false"
    display-directive="show"
    @update:show="onUpdateShow">
    <n-drawer-content :native-scrollbar="false" closable class="cloud-drive-transfer" @close="close">
      <template #header>
        <div class="cloud-drive-transfer__header">
          <button
            v-if="panelView === 'settings'"
            type="button"
            class="cloud-drive-transfer__back-btn"
            :title="t('drive.transfer.settings.back')"
            @click="panelView = 'list'">
            <svg class="size-16px" aria-hidden="true">
              <use href="#left-arrow"></use>
            </svg>
          </button>
          <span class="cloud-drive-transfer__title">
            {{ panelView === 'settings' ? t('drive.transfer.settings.title') : t('drive.transfer.title') }}
          </span>
        </div>
      </template>

      <div v-if="panelView === 'list'" class="cloud-drive-transfer__body">
        <div class="cloud-drive-transfer__tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="cloud-drive-transfer__tab"
            :class="{ 'cloud-drive-transfer__tab--active': activeTab === tab.key }"
            @click="activeTab = tab.key">
            <span class="cloud-drive-transfer__tab-label">{{ t(tab.labelKey) }}</span>
            <span v-if="getTabBadgeCount(tab.key) > 0" class="cloud-drive-transfer__tab-badge">
              {{ formatBadgeCount(getTabBadgeCount(tab.key)) }}
            </span>
          </button>
        </div>

        <div v-if="activeTab === 'uploading'" class="cloud-drive-transfer__panel">
          <div class="cloud-drive-transfer__summary">
            <svg class="size-14px cloud-drive-transfer__summary-icon" aria-hidden="true">
              <use href="#cloud"></use>
            </svg>
            <span>{{ t('drive.transfer.uploadingCount', { count: uploadingItems.length }) }}</span>
          </div>
          <div v-if="uploadingItems.length === 0" class="cloud-drive-transfer__empty">
            {{ t('drive.transfer.emptyUploading') }}
          </div>
          <div v-else class="cloud-drive-transfer__list">
            <div v-for="item in uploadingItems" :key="item.id" class="cloud-drive-transfer__item">
              <span class="cloud-drive-transfer__file-icon">
                <img class="cloud-drive-transfer__file-icon-img" :src="item.icon" :alt="item.name" draggable="false" />
              </span>
              <div class="cloud-drive-transfer__item-main">
                <div class="cloud-drive-transfer__item-top">
                  <span class="cloud-drive-transfer__file-name" :title="item.name">{{ item.name }}</span>
                  <div class="cloud-drive-transfer__item-actions">
                    <button
                      v-if="item.canResume"
                      type="button"
                      class="cloud-drive-transfer__icon-btn"
                      :title="t('drive.transfer.resume')"
                      @click="onResume(item.id)">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#play"></use>
                      </svg>
                    </button>
                    <button
                      v-else-if="item.canPause"
                      type="button"
                      class="cloud-drive-transfer__icon-btn"
                      :title="t('drive.transfer.pause')"
                      @click="onPause(item.id)">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#pause"></use>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="cloud-drive-transfer__icon-btn"
                      :title="t('drive.transfer.cancel')"
                      @click="onCancel(item.id)">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#close"></use>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="cloud-drive-transfer__file-path" :title="item.path">{{ item.path }}</div>
                <div v-if="item.statusText" class="cloud-drive-transfer__status-text">{{ item.statusText }}</div>
                <div class="cloud-drive-transfer__progress-row">
                  <n-progress
                    class="cloud-drive-transfer__progress"
                    type="line"
                    :percentage="item.percent"
                    :show-indicator="false"
                    :height="4"
                    :border-radius="2"
                    :status="item.failed ? 'error' : 'default'"
                    color="var(--primary-color)" />
                  <div class="cloud-drive-transfer__progress-meta">
                    <span class="cloud-drive-transfer__percent">{{ item.percent }}%</span>
                    <span class="cloud-drive-transfer__speed">{{ item.speed }}</span>
                    <span v-if="item.remain" class="cloud-drive-transfer__remain">
                      {{ t('drive.transfer.remain', { time: item.remain }) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'downloading'" class="cloud-drive-transfer__panel">
          <div class="cloud-drive-transfer__summary">
            <svg class="size-14px cloud-drive-transfer__summary-icon" aria-hidden="true">
              <use href="#download"></use>
            </svg>
            <span>{{ t('drive.transfer.downloadingCount', { count: downloadingItems.length }) }}</span>
          </div>
          <div v-if="downloadingItems.length === 0" class="cloud-drive-transfer__empty">
            {{ t('drive.transfer.emptyDownloading') }}
          </div>
          <div v-else class="cloud-drive-transfer__list">
            <div v-for="item in downloadingItems" :key="item.id" class="cloud-drive-transfer__item">
              <span class="cloud-drive-transfer__file-icon">
                <img class="cloud-drive-transfer__file-icon-img" :src="item.icon" :alt="item.name" draggable="false" />
              </span>
              <div class="cloud-drive-transfer__item-main">
                <div class="cloud-drive-transfer__item-top">
                  <span class="cloud-drive-transfer__file-name" :title="item.name">{{ item.name }}</span>
                  <div class="cloud-drive-transfer__item-actions">
                    <button
                      v-if="item.canResume"
                      type="button"
                      class="cloud-drive-transfer__icon-btn"
                      :title="t('drive.transfer.resume')"
                      @click="onResumeDownload(item.id)">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#play"></use>
                      </svg>
                    </button>
                    <button
                      v-else-if="item.canPause"
                      type="button"
                      class="cloud-drive-transfer__icon-btn"
                      :title="t('drive.transfer.pause')"
                      @click="onPauseDownload(item.id)">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#pause"></use>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="cloud-drive-transfer__icon-btn"
                      :title="t('drive.transfer.cancel')"
                      @click="onCancelDownload(item.id)">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#close"></use>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="cloud-drive-transfer__file-path" :title="item.path">
                  {{ t('drive.transfer.downloadTo', { path: item.path }) }}
                </div>
                <div v-if="item.statusText" class="cloud-drive-transfer__status-text">{{ item.statusText }}</div>
                <div class="cloud-drive-transfer__progress-row">
                  <n-progress
                    class="cloud-drive-transfer__progress"
                    type="line"
                    :percentage="item.percent"
                    :show-indicator="false"
                    :height="4"
                    :border-radius="2"
                    :status="item.failed ? 'error' : 'default'"
                    color="var(--primary-color)" />
                  <div class="cloud-drive-transfer__progress-meta">
                    <span class="cloud-drive-transfer__percent">{{ item.percent }}%</span>
                    <span class="cloud-drive-transfer__speed">{{ item.speed }}</span>
                    <span v-if="item.remain" class="cloud-drive-transfer__remain">
                      {{ t('drive.transfer.remain', { time: item.remain }) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="cloud-drive-transfer__panel">
          <div class="cloud-drive-transfer__summary cloud-drive-transfer__summary--done">
            <span class="cloud-drive-transfer__summary-group">
              <svg class="size-14px cloud-drive-transfer__summary-icon" aria-hidden="true">
                <use href="#cloud"></use>
              </svg>
              <span>{{ t('drive.transfer.completedUploadCount', { count: completedUploads.length }) }}</span>
            </span>
            <span class="cloud-drive-transfer__summary-group">
              <svg class="size-14px cloud-drive-transfer__summary-icon" aria-hidden="true">
                <use href="#download"></use>
              </svg>
              <span>{{ t('drive.transfer.completedDownloadCount', { count: completedDownloads.length }) }}</span>
            </span>
          </div>

          <div
            v-if="completedUploads.length === 0 && completedDownloads.length === 0"
            class="cloud-drive-transfer__empty">
            {{ t('drive.transfer.emptyCompleted') }}
          </div>

          <n-collapse
            v-else
            class="cloud-drive-transfer__collapse"
            :default-expanded-names="['upload', 'download']"
            display-directive="show">
            <n-collapse-item v-if="completedUploads.length > 0" name="upload">
              <template #header>
                <span class="cloud-drive-transfer__section-title">
                  {{ t('drive.transfer.completedUploadSection', { count: completedUploads.length }) }}
                </span>
              </template>
              <div v-for="item in completedUploads" :key="item.id" class="cloud-drive-transfer__done-item">
                <span class="cloud-drive-transfer__file-icon">
                  <img
                    class="cloud-drive-transfer__file-icon-img"
                    :src="item.icon"
                    :alt="item.name"
                    draggable="false" />
                </span>
                <div class="cloud-drive-transfer__done-main">
                  <div class="cloud-drive-transfer__done-row">
                    <span class="cloud-drive-transfer__file-name" :title="item.name">{{ item.name }}</span>
                    <span class="cloud-drive-transfer__done-size">{{ item.size }}</span>
                  </div>
                  <div class="cloud-drive-transfer__done-row">
                    <span class="cloud-drive-transfer__file-path" :title="item.path">{{ item.path }}</span>
                    <span class="cloud-drive-transfer__done-time">{{ item.time }}</span>
                  </div>
                  <div class="cloud-drive-transfer__done-status">
                    <svg class="size-12px" aria-hidden="true">
                      <use href="#cloud"></use>
                    </svg>
                    <span>
                      {{
                        item.cancelled
                          ? t('drive.transfer.status.cancelled')
                          : item.instant
                            ? t('drive.transfer.uploadInstant')
                            : t('drive.transfer.uploadDone')
                      }}
                    </span>
                  </div>
                </div>
                <span class="cloud-drive-transfer__done-check" aria-hidden="true">
                  <svg class="size-16px">
                    <use href="#check"></use>
                  </svg>
                </span>
              </div>
            </n-collapse-item>

            <n-collapse-item v-if="completedDownloads.length > 0" name="download">
              <template #header>
                <span class="cloud-drive-transfer__section-title">
                  {{ t('drive.transfer.completedDownloadSection', { count: completedDownloads.length }) }}
                </span>
              </template>
              <div v-for="item in completedDownloads" :key="item.id" class="cloud-drive-transfer__done-item">
                <span class="cloud-drive-transfer__file-icon">
                  <img
                    class="cloud-drive-transfer__file-icon-img"
                    :src="item.icon"
                    :alt="item.name"
                    draggable="false" />
                </span>
                <div class="cloud-drive-transfer__done-main">
                  <div class="cloud-drive-transfer__done-row">
                    <span class="cloud-drive-transfer__file-name" :title="item.name">{{ item.name }}</span>
                    <span class="cloud-drive-transfer__done-size">{{ item.size }}</span>
                  </div>
                  <div class="cloud-drive-transfer__done-row">
                    <span class="cloud-drive-transfer__file-path" :title="item.path">{{ item.path }}</span>
                    <span class="cloud-drive-transfer__done-time">{{ item.time }}</span>
                  </div>
                  <div class="cloud-drive-transfer__done-status">
                    <svg class="size-12px" aria-hidden="true">
                      <use href="#download"></use>
                    </svg>
                    <span>{{ t('drive.transfer.downloadDone') }}</span>
                  </div>
                </div>
                <span class="cloud-drive-transfer__done-check" aria-hidden="true">
                  <svg class="size-16px">
                    <use href="#check"></use>
                  </svg>
                </span>
              </div>
            </n-collapse-item>
          </n-collapse>
        </div>
      </div>

      <div v-else class="cloud-drive-transfer__settings">
        <div class="cloud-drive-transfer__settings-row">
          <div class="cloud-drive-transfer__settings-label">{{ t('drive.transfer.settings.parallelTasks') }}</div>
          <div class="cloud-drive-transfer__settings-fields">
            <div class="cloud-drive-transfer__settings-field">
              <span class="cloud-drive-transfer__settings-field-label">
                {{ t('drive.transfer.settings.uploadParallel') }}
              </span>
              <n-select
                :value="uploadParallelLimit"
                class="cloud-drive-transfer__settings-select"
                size="small"
                :options="parallelOptions"
                :placeholder="t('drive.transfer.settings.selectPlaceholder')"
                @update:value="onUploadParallelChange" />
            </div>
            <div class="cloud-drive-transfer__settings-field">
              <span class="cloud-drive-transfer__settings-field-label">
                {{ t('drive.transfer.settings.downloadParallel') }}
              </span>
              <n-select
                :value="downloadParallelLimit"
                class="cloud-drive-transfer__settings-select"
                size="small"
                :options="parallelOptions"
                :placeholder="t('drive.transfer.settings.selectPlaceholder')"
                @update:value="onDownloadParallelChange" />
            </div>
          </div>
        </div>

        <div class="cloud-drive-transfer__settings-row">
          <div class="cloud-drive-transfer__settings-label">{{ t('drive.transfer.settings.downloadLocation') }}</div>
          <div class="cloud-drive-transfer__settings-fields cloud-drive-transfer__settings-fields--column">
            <div class="cloud-drive-transfer__settings-path-row">
              <n-input
                :value="displayDownloadPath"
                class="cloud-drive-transfer__settings-path"
                size="small"
                :placeholder="t('drive.transfer.settings.pathPlaceholder')"
                @update:value="onDownloadPathChange" />
              <button type="button" class="cloud-drive-transfer__settings-browse" @click="browseDownloadPath">
                {{ t('drive.transfer.settings.browse') }}
              </button>
            </div>
            <n-checkbox :checked="useDefaultDownloadPath" @update:checked="onUseDefaultDownloadPathChange">
              {{ t('drive.transfer.settings.setDefaultPath') }}
            </n-checkbox>
          </div>
        </div>
      </div>

      <template v-if="panelView === 'list'" #footer>
        <div v-if="activeTab !== 'completed'" class="cloud-drive-transfer__footer">
          <button type="button" class="cloud-drive-transfer__settings-entry" @click="panelView = 'settings'">
            <svg class="size-14px" aria-hidden="true">
              <use href="#settings"></use>
            </svg>
            <span>{{ t('drive.transfer.settings.entry') }}</span>
          </button>
          <button
            v-if="activeTab === 'uploading' || activeTab === 'downloading'"
            type="button"
            class="cloud-drive-transfer__footer-btn"
            @click="onPauseAll">
            {{ t('drive.transfer.pauseAll') }}
          </button>
        </div>
        <div v-else class="cloud-drive-transfer__footer">
          <div class="cloud-drive-transfer__footer-left">
            <svg class="size-14px cloud-drive-transfer__footer-icon" aria-hidden="true">
              <use href="#clock"></use>
            </svg>
            <span>{{ t('drive.transfer.recordKeepDays', { days: recordKeepDays }) }}</span>
          </div>
          <button type="button" class="cloud-drive-transfer__footer-btn" @click="onClearCompleted">
            {{ t('drive.transfer.clearCompleted') }}
          </button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
  import { DEFAULT_SPACE_DOWNLOAD_PATH } from '@/constants/space'
  import { useSpaceDownloadStore, type SpaceDownloadTask } from '@/stores/cloudDrive/spaceDownload'
  import {
    MAX_TRANSFER_PARALLEL,
    normalizeTransferParallel,
    SPACE_UPLOAD_RECORD_KEEP_DAYS,
    useSpaceUploadStore,
    type SpaceUploadTask
  } from '@/stores/cloudDrive/spaceUpload'
  import { useUserStore } from '@/stores/user/user'
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
  import {
    cancelSpaceDownload,
    clearCompletedSpaceDownloads,
    initSpaceDownloadManager,
    pauseAllSpaceDownloads,
    pauseSpaceDownload,
    refreshSpaceDownloadQueue,
    resumeSpaceDownload
  } from '@/utils/file/spaceDownloadManager'
  import {
    cancelSpaceUpload,
    clearCompletedSpaceUploads,
    initSpaceUploadManager,
    pauseAllSpaceUploads,
    pauseSpaceUpload,
    refreshSpaceUploadQueue,
    resumeSpaceUpload
  } from '@/utils/file/spaceUploadManager'
  import { open } from '@tauri-apps/plugin-dialog'
  import type { SelectOption } from 'naive-ui'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'

  type TransferTab = 'uploading' | 'downloading' | 'completed'
  type PanelView = 'list' | 'settings'

  interface TransferProgressItem {
    id: string
    name: string
    path: string
    icon: string
    percent: number
    speed: string
    remain: string
    canPause: boolean
    canResume: boolean
    failed: boolean
    statusText: string
  }

  interface TransferDoneItem {
    id: string
    name: string
    path: string
    icon: string
    size: string
    time: string
    instant: boolean
    cancelled: boolean
  }

  interface Props {
    show: boolean
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    'update:show': [value: boolean]
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()
  const spaceUploadStore = useSpaceUploadStore()
  const spaceDownloadStore = useSpaceDownloadStore()
  const { tasks, uploadParallel, downloadParallel, downloadPath, useDefaultDownloadPath, transferActiveTab } =
    storeToRefs(spaceUploadStore)
  const { tasks: downloadTasks } = storeToRefs(spaceDownloadStore)
  const displayDownloadPath = computed(
    () => downloadPath.value.trim() || (useDefaultDownloadPath.value ? DEFAULT_SPACE_DOWNLOAD_PATH : '')
  )
  const uploadParallelLimit = computed(() => normalizeTransferParallel(uploadParallel.value))
  const downloadParallelLimit = computed(() => normalizeTransferParallel(downloadParallel.value))

  const panelView = ref<PanelView>('list')
  const activeTab = computed({
    get: () => transferActiveTab.value,
    set: (value: TransferTab) => spaceUploadStore.setTransferActiveTab(value)
  })
  const recordKeepDays = SPACE_UPLOAD_RECORD_KEEP_DAYS

  const drawerWidth = computed(() => (panelView.value === 'settings' ? 720 : 420))

  const tabs: { key: TransferTab; labelKey: string }[] = [
    { key: 'uploading', labelKey: 'drive.transfer.tabs.uploading' },
    { key: 'downloading', labelKey: 'drive.transfer.tabs.downloading' },
    { key: 'completed', labelKey: 'drive.transfer.tabs.completed' }
  ]

  const parallelOptions = computed<SelectOption[]>(() =>
    Array.from({ length: MAX_TRANSFER_PARALLEL }, (_, index) => {
      const value = index + 1
      return { label: String(value), value }
    })
  )

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    return `${(bytes / 1024 / 1024 / 1024 / 1024).toFixed(1)} TB`
  }

  const formatSpeed = (bps: number) => {
    if (!Number.isFinite(bps) || bps <= 0) return ''
    return `${formatBytes(bps)}/s`
  }

  const formatRemainByProgress = (
    status: string,
    activeStatus: string,
    speedBps: number,
    progress: number,
    fileSize: number
  ) => {
    if (status !== activeStatus || speedBps <= 0 || progress >= 100) return ''
    const remainBytes = Math.max(0, fileSize * (1 - progress / 100))
    const seconds = Math.ceil(remainBytes / speedBps)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const rest = seconds % 60
    if (minutes < 60) return `${minutes}m ${String(rest).padStart(2, '0')}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`
  }

  const formatRemain = (task: SpaceUploadTask) =>
    formatRemainByProgress(task.status, 'uploading', task.speedBps, task.progress, task.fileSize)

  const formatDownloadRemain = (task: SpaceDownloadTask) =>
    formatRemainByProgress(task.status, 'downloading', task.speedBps, task.progress, task.fileSize)

  const formatDoneTime = (iso: string) => {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const resolveErrorText = (task: SpaceUploadTask) => {
    if (!task.errorMsg) return ''
    if (task.errorMsg === 'file missing' || task.errorMsg === 'FILE_MISSING') {
      return t('drive.transfer.errors.fileMissing')
    }
    if (task.errorMsg === 'invalid file size' || task.errorMsg === 'INVALID_FILE_SIZE') {
      return t('drive.transfer.errors.invalidFileSize')
    }
    if (task.errorMsg === 'check upload failed' || task.errorMsg === 'CHECK_FAILED') {
      return t('drive.transfer.errors.checkFailed')
    }
    if (task.errorMsg === 'UPLOAD_FAILED') return t('drive.transfer.errors.uploadFailed')
    return task.errorMsg
  }

  const resolveStatusText = (task: SpaceUploadTask) => {
    if (task.status === 'failed') return resolveErrorText(task) || t('drive.transfer.status.failed')
    if (task.status === 'paused') return t('drive.transfer.status.paused')
    if (task.status === 'pending') return t('drive.transfer.status.pending')
    if (task.status === 'hashing') return t('drive.transfer.status.hashing')
    if (task.status === 'checking') return t('drive.transfer.status.checking')
    return ''
  }

  const ACTIVE_UPLOAD_STATUSES = new Set(['pending', 'hashing', 'checking', 'uploading', 'paused', 'failed'])

  const uploadingItems = computed<TransferProgressItem[]>(() =>
    tasks.value
      .filter((task) => ACTIVE_UPLOAD_STATUSES.has(task.status))
      .map((task) => ({
        id: task.id,
        name: task.fileName,
        path: task.parentPath,
        icon: getDriveListFileIconUrl(task.fileName),
        percent: task.progress,
        speed: task.status === 'uploading' ? formatSpeed(task.speedBps) : '',
        remain: formatRemain(task),
        canPause: ['pending', 'hashing', 'checking', 'uploading'].includes(task.status),
        canResume: ['paused', 'failed'].includes(task.status),
        failed: task.status === 'failed',
        statusText: resolveStatusText(task)
      }))
  )

  const resolveDownloadErrorText = (task: SpaceDownloadTask) => {
    if (!task.errorMsg) return ''
    if (task.errorMsg === 'EMPTY_DOWNLOAD_URL') return t('drive.transfer.errors.emptyDownloadUrl')
    if (task.errorMsg === 'DOWNLOAD_FAILED') return t('drive.transfer.errors.downloadFailed')
    return task.errorMsg
  }

  const resolveDownloadStatusText = (task: SpaceDownloadTask) => {
    if (task.status === 'failed') return resolveDownloadErrorText(task) || t('drive.transfer.status.failed')
    if (task.status === 'paused') return t('drive.transfer.status.paused')
    if (task.status === 'pending') return t('drive.transfer.status.pending')
    return ''
  }

  const resolveDownloadDir = (savePath: string) => {
    const normalized = (savePath || '').replace(/\\/g, '/').replace(/\/+$/, '')
    if (!normalized) return ''
    const index = normalized.lastIndexOf('/')
    return index > 0 ? normalized.slice(0, index) : normalized
  }

  const ACTIVE_DOWNLOAD_STATUSES = new Set(['pending', 'downloading', 'paused', 'failed'])

  const downloadingItems = computed<TransferProgressItem[]>(() =>
    downloadTasks.value
      .filter((task) => ACTIVE_DOWNLOAD_STATUSES.has(task.status))
      .map((task) => ({
        id: task.id,
        name: task.fileName,
        path: resolveDownloadDir(task.savePath) || task.savePath,
        icon: getDriveListFileIconUrl(task.fileName),
        percent: task.progress,
        speed: task.status === 'downloading' ? formatSpeed(task.speedBps) : '',
        remain: formatDownloadRemain(task),
        canPause: ['pending', 'downloading'].includes(task.status),
        canResume: ['paused', 'failed'].includes(task.status),
        failed: task.status === 'failed',
        statusText: resolveDownloadStatusText(task)
      }))
  )

  const getTabBadgeCount = (key: TransferTab) => {
    if (key === 'uploading') return uploadingItems.value.length
    if (key === 'downloading') return downloadingItems.value.length
    return 0
  }

  const formatBadgeCount = (count: number) => (count > 99 ? '99+' : String(count))

  const completedUploads = computed<TransferDoneItem[]>(() =>
    tasks.value
      .filter((task) => task.status === 'completed' || task.status === 'cancelled')
      .map((task) => ({
        id: task.id,
        name: task.fileName,
        path: task.parentPath,
        icon: getDriveListFileIconUrl(task.fileName),
        size: formatBytes(task.fileSize),
        time: formatDoneTime(task.completedAt || task.updatedAt),
        instant: task.instantUpload,
        cancelled: task.status === 'cancelled'
      }))
  )

  const completedDownloads = computed<TransferDoneItem[]>(() =>
    downloadTasks.value
      .filter((task) => task.status === 'completed' || task.status === 'cancelled')
      .map((task) => ({
        id: task.id,
        name: task.fileName,
        path: task.savePath,
        icon: getDriveListFileIconUrl(task.fileName),
        size: formatBytes(task.fileSize),
        time: formatDoneTime(task.completedAt || task.updatedAt),
        instant: false,
        cancelled: task.status === 'cancelled'
      }))
  )

  const onUpdateShow = (value: boolean) => {
    emit('update:show', value)
    spaceUploadStore.setTransferDrawerVisible(value)
  }

  const close = () => {
    onUpdateShow(false)
  }

  const onPause = (id: string) => {
    pauseSpaceUpload(id)
  }

  const onResume = (id: string) => {
    resumeSpaceUpload(id)
  }

  const onCancel = (id: string) => {
    cancelSpaceUpload(id)
  }

  const onPauseDownload = (id: string) => {
    pauseSpaceDownload(id)
  }

  const onResumeDownload = (id: string) => {
    resumeSpaceDownload(id)
  }

  const onCancelDownload = (id: string) => {
    cancelSpaceDownload(id)
  }

  const onPauseAll = () => {
    if (activeTab.value === 'downloading') {
      pauseAllSpaceDownloads()
      return
    }
    pauseAllSpaceUploads()
  }

  const onClearCompleted = () => {
    clearCompletedSpaceUploads()
    clearCompletedSpaceDownloads()
  }

  const onUploadParallelChange = (value: string | number | null) => {
    if (value === null) return
    spaceUploadStore.setUploadParallel(normalizeTransferParallel(value))
    refreshSpaceUploadQueue()
  }

  const onDownloadParallelChange = (value: string | number | null) => {
    if (value === null) return
    spaceUploadStore.setDownloadParallel(normalizeTransferParallel(value))
    refreshSpaceDownloadQueue()
  }

  const onDownloadPathChange = (value: string) => {
    spaceUploadStore.setDownloadPath(value)
  }

  const onUseDefaultDownloadPathChange = (value: boolean) => {
    spaceUploadStore.setUseDefaultDownloadPath(value)
  }

  const browseDownloadPath = () => {
    open({
      directory: true,
      multiple: false,
      title: t('drive.transfer.settings.browseTitle'),
      defaultPath: displayDownloadPath.value || DEFAULT_SPACE_DOWNLOAD_PATH
    }).then((selected) => {
      if (typeof selected === 'string' && selected) {
        spaceUploadStore.setDownloadPath(selected.replace(/\\/g, '/'))
      }
    })
  }

  watch(
    () => props.show,
    (show) => {
      if (!show) panelView.value = 'list'
      else {
        initSpaceUploadManager(userStore.authInfo.userId)
        initSpaceDownloadManager(userStore.authInfo.userId)
      }
    }
  )

  watch(
    () => userStore.authInfo.userId,
    (userId) => {
      if (userId) {
        // 规范化持久化的并行数（非法值回落默认）
        spaceUploadStore.setUploadParallel(normalizeTransferParallel(uploadParallel.value))
        spaceUploadStore.setDownloadParallel(normalizeTransferParallel(downloadParallel.value))
        initSpaceUploadManager(userId)
        initSpaceDownloadManager(userId)
      }
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .cloud-drive-transfer {
    &__header {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    &__back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;

      &:hover {
        color: var(--text-color);
        background: color-mix(in srgb, var(--text-color) 6%, transparent);
      }
    }

    &__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__body {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    &__tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      margin-bottom: 14px;
      padding: 3px;
      border-radius: 8px;
      background: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
    }

    &__tab {
      position: relative;
      flex: 1;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted-color);
      font-size: 13px;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease;

      &--active {
        background: var(--primary-color);
        color: #fff;
        font-weight: 500;
      }

      &:not(&--active):hover {
        color: var(--text-color);
        background: color-mix(in srgb, var(--text-color) 6%, transparent);
      }
    }

    &__tab-label {
      line-height: 1;
      user-select: none;
    }

    &__tab-badge {
      position: absolute;
      top: -4px;
      right: 2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
      color: #fff;
      background: var(--red);
      pointer-events: none;
      user-select: none;
    }

    &__panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    &__summary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      margin-bottom: 12px;
      font-size: 12px;
      color: var(--text-muted-color);
      user-select: none;

      &--done {
        gap: 16px;
      }
    }

    &__summary-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    &__summary-icon {
      color: var(--primary-color);
      flex-shrink: 0;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding-right: 2px;
    }

    &__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 120px;
      font-size: 13px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__status-text {
      margin-top: 4px;
      font-size: 11px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__item,
    &__done-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
      border-radius: 10px;
      background: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 45%, transparent);
      box-shadow: 0 1px 2px color-mix(in srgb, #000 4%, transparent);
    }

    &__file-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    &__file-icon-img {
      display: block;
      width: 28px;
      height: 28px;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
    }

    &__item-main,
    &__done-main {
      flex: 1;
      min-width: 0;
    }

    &__item-top,
    &__done-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }

    &__file-name {
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted-color);
    }

    &__file-path {
      margin-top: 2px;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 11px;
      color: var(--text-muted-color);
    }

    &__item-actions {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    &__icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;

      &:hover {
        color: var(--text-color);
        background: color-mix(in srgb, var(--bg-secondary-color) 75%, transparent);
      }
    }

    &__progress-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }

    &__progress {
      width: 100%;

      :deep(.n-progress-graph-line-rail) {
        background-color: color-mix(in srgb, var(--border-color) 55%, transparent);
      }
    }

    &__progress-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__percent {
      color: var(--primary-color);
      font-weight: 600;
      min-width: 32px;
    }

    &__speed {
      flex: 1;
      min-width: 0;
    }

    &__remain {
      flex-shrink: 0;
    }

    &__collapse {
      flex: 1;
      min-height: 0;
      overflow: auto;

      :deep(.n-collapse-item) {
        margin: 0 0 10px;
      }

      :deep(.n-collapse-item__header) {
        padding: 6px 0;
        font-size: 13px;
        color: var(--text-muted-color);
      }

      :deep(.n-collapse-item__content-inner) {
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    }

    &__section-title {
      font-weight: 500;
      user-select: none;
    }

    &__done-size,
    &__done-time {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--text-muted-color);
    }

    &__done-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 11px;
      color: var(--text-muted-color);

      svg {
        color: var(--primary-color);
      }
    }

    &__done-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-top: 6px;
      flex-shrink: 0;
      border-radius: 50%;
      color: #fff;
      background: var(--green);
    }

    &__settings {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding-top: 8px;
    }

    &__settings-row {
      display: flex;
      align-items: flex-start;
      gap: 24px;
    }

    &__settings-label {
      width: 72px;
      flex-shrink: 0;
      padding-top: 6px;
      font-size: 13px;
      color: var(--text-color);
      user-select: none;
    }

    &__settings-fields {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px 20px;
      flex: 1;
      min-width: 0;

      &--column {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }

    &__settings-field {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    &__settings-field-label {
      flex-shrink: 0;
      font-size: 13px;
      color: var(--text-color);
      white-space: nowrap;
      user-select: none;
    }

    &__settings-select {
      width: 120px;
      flex-shrink: 0;
    }

    &__settings-path-row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-width: 0;
    }

    &__settings-path {
      flex: 1;
      min-width: 0;
      max-width: 420px;
    }

    &__settings-browse {
      flex-shrink: 0;
      height: 28px;
      padding: 0 14px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--bg-primary-color);
      color: var(--text-color);
      font-size: 13px;
      cursor: pointer;

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }

    &__settings-entry {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 12px;
      color: var(--text-muted-color);
      cursor: pointer;
      user-select: none;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      min-width: 0;
    }

    &__footer-left {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      font-size: 12px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__footer-icon {
      flex-shrink: 0;
      color: var(--text-muted-color);
    }

    &__footer-btn {
      flex-shrink: 0;
      height: 30px;
      padding: 0 12px;
      border: none;
      border-radius: 8px;
      background: color-mix(in srgb, var(--primary-color) 14%, var(--bg-primary-color));
      color: var(--primary-color);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        background: color-mix(in srgb, var(--primary-color) 20%, var(--bg-primary-color));
      }
    }
  }
</style>

<style lang="scss">
  .cloud-drive-transfer {
    .n-drawer-header {
      padding: 16px 12px 10px;
    }

    .n-drawer-body {
      padding: 0;
    }

    .n-drawer-footer {
      padding: 12px 12px 16px;
      border-top: 1px solid color-mix(in srgb, var(--divider-color) 80%, transparent);
    }
  }
</style>
