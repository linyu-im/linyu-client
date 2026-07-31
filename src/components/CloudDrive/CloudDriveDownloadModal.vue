<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center">
    <div class="cloud-drive-download-modal">
      <div class="cloud-drive-download-modal__body">
        <div class="cloud-drive-download-modal__file">
          <img class="cloud-drive-download-modal__icon" :src="iconUrl" :alt="displayName" draggable="false" />
          <div class="cloud-drive-download-modal__file-meta">
            <span class="cloud-drive-download-modal__name" :title="displayName">{{ displayName }}</span>
            <span v-if="fileCount > 1" class="cloud-drive-download-modal__count">
              {{ t('drive.download.fileCount', { count: fileCount }) }}
            </span>
          </div>
        </div>

        <div class="cloud-drive-download-modal__path-bar">
          <span class="cloud-drive-download-modal__path-label">{{ t('drive.download.downloadTo') }}</span>
          <span class="cloud-drive-download-modal__path-value" :title="downloadPath">{{ downloadPath }}</span>
          <button
            type="button"
            class="cloud-drive-download-modal__browse"
            :title="t('drive.transfer.settings.browseTitle')"
            @click="browsePath">
            <svg class="size-16px" aria-hidden="true">
              <use href="#folder"></use>
            </svg>
          </button>
        </div>

        <n-checkbox v-model:checked="setAsDefault" class="cloud-drive-download-modal__checkbox">
          {{ t('drive.download.setDefaultPath') }}
        </n-checkbox>
      </div>

      <div class="cloud-drive-download-modal__footer">
        <n-button class="cloud-drive-download-modal__btn cloud-drive-download-modal__btn--cancel" @click="onCancel">
          {{ t('drive.download.cancel') }}
        </n-button>
        <n-button type="primary" class="cloud-drive-download-modal__btn" :disabled="!downloadPath" @click="onConfirm">
          {{ t('drive.download.confirm') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { DEFAULT_SPACE_DOWNLOAD_PATH } from '@/constants/space'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useSpaceUploadStore } from '@/stores/cloudDrive/spaceUpload'
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
  import { open } from '@tauri-apps/plugin-dialog'
  import { useI18n } from 'vue-i18n'

  export interface CloudDriveDownloadTarget {
    fileName: string
    fileType?: string
  }

  const visible = defineModel<boolean>('show', { default: false })

  const props = withDefaults(
    defineProps<{
      files?: CloudDriveDownloadTarget[]
    }>(),
    {
      files: () => []
    }
  )

  const emit = defineEmits<{
    confirm: [payload: { saveDir: string; setAsDefault: boolean }]
    cancel: []
  }>()

  const { t } = useI18n()
  const spaceUploadStore = useSpaceUploadStore()

  const downloadPath = ref('')
  const setAsDefault = ref(false)

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const firstFile = computed(() => props.files[0])
  const fileCount = computed(() => props.files.length)
  const displayName = computed(() => firstFile.value?.fileName || '')
  const iconUrl = computed(() => getDriveListFileIconUrl(firstFile.value?.fileName || '', false))

  const syncInitialPath = () => {
    downloadPath.value = spaceUploadStore.getEffectiveDownloadPath() || DEFAULT_SPACE_DOWNLOAD_PATH
    setAsDefault.value = false
  }

  watch(
    () => visible.value,
    (show) => {
      if (show) syncInitialPath()
    }
  )

  const browsePath = () => {
    open({
      directory: true,
      multiple: false,
      title: t('drive.transfer.settings.browseTitle'),
      defaultPath: downloadPath.value || DEFAULT_SPACE_DOWNLOAD_PATH
    }).then((selected) => {
      if (typeof selected === 'string' && selected) {
        downloadPath.value = selected.replace(/\\/g, '/')
      }
    })
  }

  const onCancel = () => {
    visible.value = false
    emit('cancel')
  }

  const onConfirm = () => {
    const saveDir = downloadPath.value.trim().replace(/\\/g, '/')
    if (!saveDir) return
    emit('confirm', { saveDir, setAsDefault: setAsDefault.value })
    visible.value = false
  }
</script>

<style scoped lang="scss">
  .cloud-drive-download-modal {
    width: 460px;
    max-width: calc(100vw - 32px);
    border-radius: 12px;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    overflow: hidden;

    &__body {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 28px 28px 20px;
    }

    &__file {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    &__icon {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    &__file-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__name {
      font-size: 15px;
      line-height: 1.4;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__count {
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__path-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 14px 0 16px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--bg-secondary-color) 88%, transparent);
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
    }

    &__path-label {
      flex-shrink: 0;
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    &__path-value {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__browse {
      display: flex;
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
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 10%, transparent);
      }
    }

    &__checkbox {
      margin-left: 4px;
      font-size: 13px;
      color: var(--text-muted-color);

      :deep(.n-checkbox__label) {
        color: var(--text-muted-color);
      }
    }

    &__footer {
      display: flex;
      gap: 12px;
      padding: 16px 28px 24px;
      border-top: 1px solid color-mix(in srgb, var(--border-color) 80%, transparent);
    }

    &__btn {
      flex: 1;
      height: 40px;
      border-radius: 999px;
      font-size: 14px;

      &--cancel {
        color: var(--primary-color);
        background: var(--button-soft-bg);
        border: none;

        &:hover {
          color: var(--primary-color);
          background: color-mix(in srgb, var(--button-soft-bg) 70%, var(--primary-color));
        }
      }
    }
  }
</style>
