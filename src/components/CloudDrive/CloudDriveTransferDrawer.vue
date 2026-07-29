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
            {{ t(tab.labelKey) }}
          </button>
        </div>

        <div v-if="activeTab === 'uploading'" class="cloud-drive-transfer__panel">
          <div class="cloud-drive-transfer__summary">
            <svg class="size-14px cloud-drive-transfer__summary-icon" aria-hidden="true">
              <use href="#cloud"></use>
            </svg>
            <span>{{ t('drive.transfer.uploadingCount', { count: uploadingItems.length }) }}</span>
          </div>
          <div class="cloud-drive-transfer__list">
            <div v-for="item in uploadingItems" :key="item.id" class="cloud-drive-transfer__item">
              <span class="cloud-drive-transfer__file-icon">
                <img class="cloud-drive-transfer__file-icon-img" :src="item.icon" :alt="item.name" draggable="false" />
              </span>
              <div class="cloud-drive-transfer__item-main">
                <div class="cloud-drive-transfer__item-top">
                  <span class="cloud-drive-transfer__file-name" :title="item.name">{{ item.name }}</span>
                  <div class="cloud-drive-transfer__item-actions">
                    <button type="button" class="cloud-drive-transfer__icon-btn" :title="t('drive.transfer.pause')">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#pause"></use>
                      </svg>
                    </button>
                    <button type="button" class="cloud-drive-transfer__icon-btn" :title="t('drive.transfer.cancel')">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#close"></use>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="cloud-drive-transfer__file-path" :title="item.path">{{ item.path }}</div>
                <div class="cloud-drive-transfer__progress-row">
                  <n-progress
                    class="cloud-drive-transfer__progress"
                    type="line"
                    :percentage="item.percent"
                    :show-indicator="false"
                    :height="4"
                    :border-radius="2"
                    color="var(--primary-color)" />
                  <div class="cloud-drive-transfer__progress-meta">
                    <span class="cloud-drive-transfer__percent">{{ item.percent }}%</span>
                    <span class="cloud-drive-transfer__speed">{{ item.speed }}</span>
                    <span class="cloud-drive-transfer__remain">
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
          <div class="cloud-drive-transfer__list">
            <div v-for="item in downloadingItems" :key="item.id" class="cloud-drive-transfer__item">
              <span class="cloud-drive-transfer__file-icon">
                <img class="cloud-drive-transfer__file-icon-img" :src="item.icon" :alt="item.name" draggable="false" />
              </span>
              <div class="cloud-drive-transfer__item-main">
                <div class="cloud-drive-transfer__item-top">
                  <span class="cloud-drive-transfer__file-name" :title="item.name">{{ item.name }}</span>
                  <div class="cloud-drive-transfer__item-actions">
                    <button type="button" class="cloud-drive-transfer__icon-btn" :title="t('drive.transfer.pause')">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#pause"></use>
                      </svg>
                    </button>
                    <button type="button" class="cloud-drive-transfer__icon-btn" :title="t('drive.transfer.cancel')">
                      <svg class="size-14px" aria-hidden="true">
                        <use href="#close"></use>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="cloud-drive-transfer__file-path" :title="item.path">
                  {{ t('drive.transfer.from', { path: item.path }) }}
                </div>
                <div class="cloud-drive-transfer__progress-row">
                  <n-progress
                    class="cloud-drive-transfer__progress"
                    type="line"
                    :percentage="item.percent"
                    :show-indicator="false"
                    :height="4"
                    :border-radius="2"
                    color="var(--primary-color)" />
                  <div class="cloud-drive-transfer__progress-meta">
                    <span class="cloud-drive-transfer__percent">{{ item.percent }}%</span>
                    <span class="cloud-drive-transfer__speed">{{ item.speed }}</span>
                    <span class="cloud-drive-transfer__remain">
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

          <n-collapse
            class="cloud-drive-transfer__collapse"
            :default-expanded-names="['upload', 'download']"
            display-directive="show">
            <n-collapse-item name="upload">
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
                    <span>{{ t('drive.transfer.uploadDone') }}</span>
                  </div>
                </div>
                <span class="cloud-drive-transfer__done-check" aria-hidden="true">
                  <svg class="size-16px">
                    <use href="#check"></use>
                  </svg>
                </span>
              </div>
            </n-collapse-item>

            <n-collapse-item name="download">
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
                v-model:value="uploadParallel"
                class="cloud-drive-transfer__settings-select"
                size="small"
                :options="parallelOptions"
                :placeholder="t('drive.transfer.settings.selectPlaceholder')" />
            </div>
            <div class="cloud-drive-transfer__settings-field">
              <span class="cloud-drive-transfer__settings-field-label">
                {{ t('drive.transfer.settings.downloadParallel') }}
              </span>
              <n-select
                v-model:value="downloadParallel"
                class="cloud-drive-transfer__settings-select"
                size="small"
                :options="parallelOptions"
                :placeholder="t('drive.transfer.settings.selectPlaceholder')" />
              <span class="cloud-drive-transfer__settings-tip">{{ t('drive.transfer.settings.smartRecommend') }}</span>
            </div>
          </div>
        </div>

        <div class="cloud-drive-transfer__settings-row">
          <div class="cloud-drive-transfer__settings-label">{{ t('drive.transfer.settings.downloadLocation') }}</div>
          <div class="cloud-drive-transfer__settings-fields cloud-drive-transfer__settings-fields--column">
            <div class="cloud-drive-transfer__settings-path-row">
              <n-input
                v-model:value="downloadPath"
                class="cloud-drive-transfer__settings-path"
                size="small"
                :placeholder="t('drive.transfer.settings.pathPlaceholder')" />
              <button type="button" class="cloud-drive-transfer__settings-browse" @click="browseDownloadPath">
                {{ t('drive.transfer.settings.browse') }}
              </button>
            </div>
            <n-checkbox v-model:checked="useDefaultDownloadPath" class="cloud-drive-transfer__settings-checkbox">
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
          <button type="button" class="cloud-drive-transfer__footer-btn">
            {{ t('drive.transfer.pauseAll') }}
          </button>
        </div>
        <div v-else class="cloud-drive-transfer__footer">
          <div class="cloud-drive-transfer__footer-left">
            <svg class="size-14px cloud-drive-transfer__footer-icon" aria-hidden="true">
              <use href="#clock"></use>
            </svg>
            <span>{{ t('drive.transfer.recordKeepDays', { days: 30 }) }}</span>
          </div>
          <button type="button" class="cloud-drive-transfer__footer-btn">
            {{ t('drive.transfer.clearCompleted') }}
          </button>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
  import { getDriveListFileIconUrl, getFolderIconUrl } from '@/utils/file/fileIcon'
  import { open } from '@tauri-apps/plugin-dialog'
  import type { SelectOption } from 'naive-ui'
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
  }

  interface TransferDoneItem {
    id: string
    name: string
    path: string
    icon: string
    size: string
    time: string
  }

  interface Props {
    show: boolean
  }

  const props = defineProps<Props>()

  const emit = defineEmits<{
    'update:show': [value: boolean]
  }>()

  const { t } = useI18n()

  const panelView = ref<PanelView>('list')
  const activeTab = ref<TransferTab>('uploading')
  const uploadParallel = ref<string | number>('smart')
  const downloadParallel = ref<string | number>('smart')
  const downloadPath = ref('E:\\BaiduNetdiskDownload')
  const useDefaultDownloadPath = ref(true)

  const drawerWidth = computed(() => (panelView.value === 'settings' ? 720 : 420))

  const tabs: { key: TransferTab; labelKey: string }[] = [
    { key: 'uploading', labelKey: 'drive.transfer.tabs.uploading' },
    { key: 'downloading', labelKey: 'drive.transfer.tabs.downloading' },
    { key: 'completed', labelKey: 'drive.transfer.tabs.completed' }
  ]

  const parallelOptions = computed<SelectOption[]>(() => [
    { label: () => t('drive.transfer.settings.smart'), value: 'smart' },
    ...[1, 2, 3, 4, 5, 6, 8, 10].map((value) => ({ label: String(value), value }))
  ])

  const uploadingItems = ref<TransferProgressItem[]>([
    {
      id: 'u1',
      name: '产品设计稿',
      path: '/我的云盘/工作资料/设计/',
      icon: getFolderIconUrl(),
      percent: 68,
      speed: '2.1 MB/s',
      remain: '12s'
    },
    {
      id: 'u2',
      name: '团队合影.jpg',
      path: '/我的云盘/照片/',
      icon: getDriveListFileIconUrl('团队合影.jpg'),
      percent: 42,
      speed: '1.4 MB/s',
      remain: '28s'
    },
    {
      id: 'u3',
      name: '宣传片.mp4',
      path: '/我的云盘/视频/',
      icon: getDriveListFileIconUrl('宣传片.mp4'),
      percent: 23,
      speed: '3.6 MB/s',
      remain: '1m 05s'
    },
    {
      id: 'u4',
      name: '需求文档.docx',
      path: '/我的云盘/工作资料/',
      icon: getDriveListFileIconUrl('需求文档.docx'),
      percent: 91,
      speed: '860 KB/s',
      remain: '3s'
    }
  ])

  const downloadingItems = ref<TransferProgressItem[]>([
    {
      id: 'd1',
      name: '团队合影.jpg',
      path: '我的云盘/照片',
      icon: getDriveListFileIconUrl('团队合影.jpg'),
      percent: 68,
      speed: '3.2 MB/s',
      remain: '12s'
    },
    {
      id: 'd2',
      name: '素材包.zip',
      path: '我的云盘/资源',
      icon: getDriveListFileIconUrl('素材包.zip'),
      percent: 35,
      speed: '4.8 MB/s',
      remain: '41s'
    },
    {
      id: 'd3',
      name: '演示视频.mp4',
      path: '我的云盘/视频',
      icon: getDriveListFileIconUrl('演示视频.mp4'),
      percent: 12,
      speed: '2.6 MB/s',
      remain: '2m 18s'
    }
  ])

  const completedUploads = ref<TransferDoneItem[]>([
    {
      id: 'cu1',
      name: '项目计划书.docx',
      path: '/我的云盘/工作资料',
      icon: getDriveListFileIconUrl('项目计划书.docx'),
      size: '1.8 MB',
      time: '17:32'
    },
    {
      id: 'cu2',
      name: '季度汇报.pptx',
      path: '/我的云盘/工作资料',
      icon: getDriveListFileIconUrl('季度汇报.pptx'),
      size: '6.2 MB',
      time: '16:48'
    },
    {
      id: 'cu3',
      name: '设计素材.zip',
      path: '/我的云盘/资源',
      icon: getDriveListFileIconUrl('设计素材.zip'),
      size: '28.4 MB',
      time: '15:20'
    }
  ])

  const completedDownloads = ref<TransferDoneItem[]>([
    {
      id: 'cd1',
      name: '数据报表.xlsx',
      path: '/我的云盘/工作资料',
      icon: getDriveListFileIconUrl('数据报表.xlsx'),
      size: '940 KB',
      time: '17:10'
    },
    {
      id: 'cd2',
      name: '产品演示.mp4',
      path: '/我的云盘/视频',
      icon: getDriveListFileIconUrl('产品演示.mp4'),
      size: '126 MB',
      time: '14:55'
    },
    {
      id: 'cd3',
      name: '说明书.pdf',
      path: '/我的云盘/文档',
      icon: getDriveListFileIconUrl('说明书.pdf'),
      size: '3.1 MB',
      time: '21:06'
    }
  ])

  const onUpdateShow = (value: boolean) => {
    emit('update:show', value)
  }

  const close = () => {
    emit('update:show', false)
  }

  const browseDownloadPath = () => {
    open({
      directory: true,
      multiple: false,
      title: t('drive.transfer.settings.browseTitle'),
      defaultPath: downloadPath.value || undefined
    }).then((selected) => {
      if (typeof selected === 'string' && selected) {
        downloadPath.value = selected
      }
    })
  }

  watch(
    () => props.show,
    (show) => {
      if (!show) panelView.value = 'list'
    }
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
      color: var(--text-secondary-color);
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
      flex: 1;
      height: 30px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary-color);
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
      color: var(--text-secondary-color);
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
      color: var(--text-color);
    }

    &__file-path {
      margin-top: 2px;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: 11px;
      color: var(--text-secondary-color);
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
      color: var(--text-secondary-color);
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
      color: var(--text-secondary-color);
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
        color: var(--text-color);
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
      color: var(--text-secondary-color);
    }

    &__done-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 11px;
      color: var(--text-secondary-color);

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

    &__settings-tip {
      font-size: 12px;
      color: var(--text-secondary-color);
      white-space: nowrap;
      user-select: none;
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

    &__settings-checkbox {
      :deep(.n-checkbox__label) {
        color: var(--text-muted-color);
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
      color: var(--text-secondary-color);
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
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__footer-icon {
      flex-shrink: 0;
      color: var(--text-secondary-color);
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
