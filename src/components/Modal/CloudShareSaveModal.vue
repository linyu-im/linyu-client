<template>
  <n-modal v-model:show="visible" :mask-closable="true" :auto-focus="false" transform-origin="center">
    <div class="cloud-share-save-modal">
      <div class="cloud-share-save-modal__header">
        <h2 class="cloud-share-save-modal__title">{{ t('message.cloudShare.saveTitle') }}</h2>
        <button
          type="button"
          class="cloud-share-save-modal__close"
          :aria-label="t('message.cloudShare.close')"
          @click="onClose">
          <svg class="size-14px" aria-hidden="true">
            <use href="#close"></use>
          </svg>
        </button>
      </div>

      <div class="cloud-share-save-modal__body">
        <div v-if="files.length === 0" class="cloud-share-save-modal__empty">
          {{ t('message.cloudShare.empty') }}
        </div>
        <n-scrollbar v-else class="cloud-share-save-modal__scroll">
          <div class="cloud-share-save-modal__list">
            <div v-for="item in files" :key="item.spaceFileId" class="cloud-share-save-modal__item">
              <img
                class="cloud-share-save-modal__item-icon"
                :src="resolveItemIconUrl(item)"
                :alt="item.shareName"
                draggable="false" />
              <div class="cloud-share-save-modal__item-info">
                <span class="cloud-share-save-modal__item-name" :title="item.shareName">{{ item.shareName }}</span>
                <span class="cloud-share-save-modal__item-meta">{{ resolveItemMeta(item) }}</span>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </div>

      <div class="cloud-share-save-modal__footer">
        <button
          type="button"
          class="cloud-share-save-modal__dir-btn"
          :disabled="saving"
          :title="t('message.cloudShare.selectDir')"
          :aria-label="t('message.cloudShare.selectDir')"
          @click="dirPickerVisible = true">
          <img class="cloud-share-save-modal__dir-icon" :src="folderIcon" alt="" draggable="false" />
          <span class="cloud-share-save-modal__dir-text">{{ targetDirLabel }}</span>
          <svg class="cloud-share-save-modal__dir-arrow size-12px" aria-hidden="true">
            <use href="#right-arrow"></use>
          </svg>
        </button>
        <n-button
          type="primary"
          class="cloud-share-save-modal__save-btn"
          :loading="saving"
          :disabled="!canSave"
          @click="onSave">
          {{ t('message.cloudShare.save') }}
        </n-button>
      </div>
    </div>
  </n-modal>

  <CloudDriveMoveModal
    v-model:show="dirPickerVisible"
    mode="select"
    :initial-selected-id="targetDirId"
    @success="onDirSelected" />
</template>

<script setup lang="ts">
  import { spaceApi } from '@/api'
  import CloudDriveMoveModal from '@/components/CloudDrive/CloudDriveMoveModal.vue'
  import { SpaceRootParentId } from '@/constants/space'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import type { CloudShareItem } from '@/types/api/message'
  import { getFileExtension, getFileIconUrl, getFolderIconUrl } from '@/utils/file/fileIcon'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  const props = withDefaults(
    defineProps<{
      files?: CloudShareItem[]
    }>(),
    {
      files: () => []
    }
  )

  const { t } = useI18n()
  const folderIcon = getFolderIconUrl()

  const dirPickerVisible = ref(false)
  const saving = ref(false)
  const targetDirId = ref<string>(SpaceRootParentId)
  const targetDirLabel = ref('')

  useEscapeOverlay(() => {
    if (dirPickerVisible.value) {
      dirPickerVisible.value = false
      return
    }
    visible.value = false
  }, visible)

  const canSave = computed(
    () => props.files.some((item) => Boolean(item.spaceFileId)) && Boolean(targetDirId.value) && !saving.value
  )

  const formatSize = (size: number | string) => {
    const bytes = Number(size)
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }

  const resolveItemIconUrl = (item: CloudShareItem) => {
    if (item.isDir || item.fileType?.toLowerCase() === 'folder') {
      return getFolderIconUrl()
    }
    const ext = (item.fileType || '').trim().toLowerCase()
    const name = item.shareName || ''
    const fileName = getFileExtension(name) || !ext ? name : `${name}.${ext}`
    return getFileIconUrl(fileName)
  }

  const resolveItemMeta = (item: CloudShareItem) => {
    if (item.isDir || item.fileType?.toLowerCase() === 'folder') {
      return t('drive.files.types.folder')
    }
    return formatSize(item.fileSize)
  }

  const resetState = () => {
    targetDirId.value = SpaceRootParentId
    targetDirLabel.value = t('drive.path.allFiles')
    saving.value = false
  }

  const onClose = () => {
    visible.value = false
  }

  const onDirSelected = (dirId: string, dirName: string) => {
    targetDirId.value = dirId || SpaceRootParentId
    targetDirLabel.value = dirName || t('drive.path.allFiles')
  }

  const onSave = () => {
    if (!canSave.value) return
    const spaceFileIds = props.files.map((item) => item.spaceFileId).filter(Boolean)
    if (spaceFileIds.length === 0) return

    saving.value = true
    spaceApi
      .transferSpaceUserFile({
        spaceFileIds,
        targetDirId: targetDirId.value
      })
      .then((res) => {
        if (res.code === 0) {
          window.$message.success(t('message.cloudShare.saveSuccess'))
          visible.value = false
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        saving.value = false
      })
  }

  watch(
    () => visible.value,
    (show) => {
      if (show) {
        resetState()
        return
      }
      dirPickerVisible.value = false
    }
  )
</script>

<style scoped lang="scss">
  .cloud-share-save-modal {
    width: 420px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 48px);
    border-radius: 12px;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 16px 10px 18px;
      flex-shrink: 0;
    }

    &__title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.3;
      color: var(--text-color);
      user-select: none;
    }

    &__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 70%, transparent);
        color: var(--text-color);
      }
    }

    &__body {
      min-height: 180px;
      max-height: 360px;
      padding: 0 8px;
      flex: 1;
      overflow: hidden;
    }

    &__scroll {
      max-height: 360px;
    }

    &__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 180px;
      color: var(--text-secondary-color);
      font-size: 13px;
    }

    &__list {
      display: flex;
      flex-direction: column;
      padding: 4px 8px 8px;
      gap: 2px;
    }

    &__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      user-select: none;

      &:hover {
        background: var(--button-soft-bg);
      }
    }

    &__item-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      object-fit: contain;
      pointer-events: none;
    }

    &__item-info {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    &__item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-color);
      font-size: 14px;
      line-height: 1.3;
    }

    &__item-meta {
      color: var(--text-secondary-color);
      font-size: 12px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    &__footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px 16px;
      border-top: 1px solid var(--divider-color);
      flex-shrink: 0;
    }

    &__dir-btn {
      min-width: 0;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary-color);
      color: var(--text-color);
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: var(--primary-color);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    &__dir-icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      object-fit: contain;
      pointer-events: none;
    }

    &__dir-text {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
      font-size: 13px;
    }

    &__dir-arrow {
      flex-shrink: 0;
      color: var(--text-secondary-color);
    }

    &__save-btn {
      flex-shrink: 0;
      min-width: 72px;
    }
  }
</style>
