<template>
  <n-modal v-model:show="visible" :mask-closable="true" :auto-focus="false" transform-origin="center">
    <div class="cloud-drive-file-detail-modal">
      <div class="cloud-drive-file-detail-modal__header">
        <h2 class="cloud-drive-file-detail-modal__title">{{ t('drive.detail.title') }}</h2>
        <button
          type="button"
          class="cloud-drive-file-detail-modal__close"
          :aria-label="t('drive.detail.close')"
          @click="onClose">
          <svg class="size-14px" aria-hidden="true">
            <use href="#close"></use>
          </svg>
        </button>
      </div>

      <div class="cloud-drive-file-detail-modal__body">
        <n-spin :show="loading" class="cloud-drive-file-detail-modal__spin">
          <div v-if="detail" class="cloud-drive-file-detail-modal__card">
            <div class="cloud-drive-file-detail-modal__file">
              <img
                class="cloud-drive-file-detail-modal__icon"
                :src="iconUrl"
                :alt="detail.fileName"
                draggable="false" />
              <span class="cloud-drive-file-detail-modal__name" :title="detail.fileName">{{ detail.fileName }}</span>
            </div>

            <div class="cloud-drive-file-detail-modal__divider" />

            <dl class="cloud-drive-file-detail-modal__meta">
              <div class="cloud-drive-file-detail-modal__row">
                <dt>{{ t('drive.detail.type') }}</dt>
                <dd>{{ typeLabel }}</dd>
              </div>
              <div class="cloud-drive-file-detail-modal__row">
                <dt>{{ t('drive.detail.location') }}</dt>
                <dd :title="locationLabel">{{ locationLabel }}</dd>
              </div>
              <div class="cloud-drive-file-detail-modal__row">
                <dt>{{ t('drive.detail.size') }}</dt>
                <dd>{{ sizeLabel }}</dd>
              </div>
              <div v-if="detail.isDir" class="cloud-drive-file-detail-modal__row">
                <dt>{{ t('drive.detail.contains') }}</dt>
                <dd>
                  {{
                    t('drive.detail.containsValue', {
                      fileCount: detail.contains?.fileCount ?? 0,
                      folderCount: detail.contains?.folderCount ?? 0
                    })
                  }}
                </dd>
              </div>
              <div class="cloud-drive-file-detail-modal__row">
                <dt>{{ t('drive.detail.modified') }}</dt>
                <dd>{{ modifiedLabel }}</dd>
              </div>
            </dl>
          </div>
        </n-spin>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { spaceApi } from '@/api'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import type { SpaceUserFileDetailResult } from '@/types/api/space'
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
  import { useI18n } from 'vue-i18n'

  const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'heic', 'heif'])
  const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'])

  const visible = defineModel<boolean>('show', { default: false })

  const props = withDefaults(
    defineProps<{
      spaceFileId?: string
    }>(),
    {
      spaceFileId: ''
    }
  )

  const { t, locale } = useI18n()

  const loading = ref(false)
  const detail = ref<SpaceUserFileDetailResult | null>(null)

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const iconUrl = computed(() => {
    if (!detail.value) return getDriveListFileIconUrl('', true)
    return getDriveListFileIconUrl(detail.value.fileName, detail.value.isDir)
  })

  const typeLabel = computed(() => {
    if (!detail.value) return ''
    if (detail.value.isDir) return t('drive.files.types.folder')
    const ext = (detail.value.fileType || '').trim().toLowerCase()
    if (!ext || ext === 'file' || ext === 'folder') return t('drive.files.types.file')
    if (IMAGE_EXTS.has(ext)) return t('drive.files.types.image')
    if (ext === 'pdf') return t('drive.files.types.pdf')
    if (ARCHIVE_EXTS.has(ext)) return t('drive.files.types.archive')
    return ext.toUpperCase()
  })

  const locationLabel = computed(() => {
    const location = (detail.value?.location || '').trim()
    if (!location || location === '/') return t('drive.sidebar.myDrive')
    return location
  })

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
    return `${(bytes / 1024 / 1024 / 1024 / 1024).toFixed(2)} TB`
  }

  const sizeLabel = computed(() => {
    const size = Number(detail.value?.size) || 0
    return t('drive.detail.sizeValue', {
      size: formatBytes(size),
      bytes: size.toLocaleString(locale.value === 'zh' ? 'zh-CN' : 'en-US')
    })
  })

  const pad = (value: number) => String(value).padStart(2, '0')

  const modifiedLabel = computed(() => {
    const raw = (detail.value?.updatedAt || '').trim()
    if (!raw) return '-'
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
    const date = new Date(normalized)
    if (Number.isNaN(date.getTime())) return raw
    return t('drive.detail.modifiedValue', {
      year: date.getFullYear(),
      month: pad(date.getMonth() + 1),
      day: pad(date.getDate()),
      hour: pad(date.getHours()),
      minute: pad(date.getMinutes())
    })
  })

  const fetchDetail = (spaceFileId: string) => {
    if (!spaceFileId) {
      detail.value = null
      return
    }
    loading.value = true
    detail.value = null
    spaceApi
      .getSpaceUserFileDetail({ spaceFileId })
      .then((res) => {
        if (res.code === 0 && res.data) {
          detail.value = res.data
          return
        }
        window.$message.error(res.msg)
        visible.value = false
      })
      .catch(() => {
        visible.value = false
      })
      .finally(() => {
        loading.value = false
      })
  }

  const onClose = () => {
    visible.value = false
  }

  watch(
    () => visible.value,
    (show) => {
      if (!show) {
        detail.value = null
        loading.value = false
        return
      }
      fetchDetail(props.spaceFileId)
    }
  )

  watch(
    () => props.spaceFileId,
    (spaceFileId) => {
      if (visible.value) fetchDetail(spaceFileId)
    }
  )
</script>

<style scoped lang="scss">
  .cloud-drive-file-detail-modal {
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
        color: var(--text-color);
        background: color-mix(in srgb, var(--card-bg-color) 70%, transparent);
      }
    }

    &__body {
      padding: 4px 18px 20px;
      flex: 1;
      min-height: 0;
    }

    &__spin {
      width: 100%;
      min-height: 180px;

      :deep(.n-spin-container),
      :deep(.n-spin-content) {
        min-height: 180px;
      }
    }

    &__card {
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      border-radius: 10px;
      background: var(--bg-secondary-color);
      padding: 20px 18px 16px;
      box-sizing: border-box;
    }

    &__file {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      padding: 0 4px 16px;
    }

    &__icon {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
      pointer-events: none;
    }

    &__name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 15px;
      font-weight: 500;
      line-height: 1.4;
      color: var(--text-color);
    }

    &__divider {
      height: 1px;
      margin: 0 0 14px;
      background: color-mix(in srgb, var(--border-color) 80%, transparent);
    }

    &__meta {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    &__row {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      font-size: 13px;
      line-height: 1.5;

      dt {
        margin: 0;
        color: var(--text-secondary-color);
        user-select: none;
      }

      dd {
        margin: 0;
        min-width: 0;
        color: var(--text-color);
        word-break: break-all;
      }
    }
  }
</style>
