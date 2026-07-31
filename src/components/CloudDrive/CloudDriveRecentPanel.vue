<template>
  <section class="cloud-drive-recent">
    <header class="cloud-drive-recent__header">
      <h1 class="cloud-drive-recent__title">{{ t('drive.recent.title') }}</h1>
    </header>

    <div class="cloud-drive-recent__head">
      <p class="cloud-drive-recent__hint">{{ t('drive.recent.hint') }}</p>
      <div class="cloud-drive-recent__toolbar">
        <button
          type="button"
          class="cloud-drive-recent__action-btn cloud-drive-recent__action-btn--danger"
          :disabled="!hasSelection || removing"
          :title="t('drive.recent.actions.remove')"
          @click="confirmRemoveSelected()">
          <svg class="cloud-drive-recent__action-btn-icon" aria-hidden="true">
            <use href="#trash"></use>
          </svg>
          <span class="cloud-drive-recent__action-btn-label">{{ t('drive.recent.actions.remove') }}</span>
        </button>
        <span class="cloud-drive-recent__toolbar-divider"></span>
        <button
          type="button"
          class="cloud-drive-recent__action-btn cloud-drive-recent__action-btn--outline"
          :disabled="itemList.length === 0 || clearing"
          :title="t('drive.recent.actions.clear')"
          @click="confirmClearRecent">
          <span class="cloud-drive-recent__action-btn-label">{{ t('drive.recent.actions.clear') }}</span>
        </button>
      </div>
    </div>

    <div class="cloud-drive-recent__table-wrap">
      <n-spin :show="listLoading" class="cloud-drive-recent__spin">
        <div v-if="showEmpty" class="cloud-drive-recent__empty">
          <div class="cloud-drive-recent__empty-text">
            <p>{{ t('drive.recent.empty') }}</p>
          </div>
        </div>
        <table v-else class="cloud-drive-recent__table">
          <thead>
            <tr>
              <th class="cloud-drive-recent__col-check">
                <n-checkbox
                  :checked="allSelected"
                  :indeterminate="someSelected && !allSelected"
                  @update:checked="setAllSelected" />
              </th>
              <th class="cloud-drive-recent__col-name">{{ t('drive.recent.columns.name') }}</th>
              <th class="cloud-drive-recent__col-type">{{ t('drive.recent.columns.type') }}</th>
              <th class="cloud-drive-recent__col-size">{{ t('drive.recent.columns.size') }}</th>
              <th class="cloud-drive-recent__col-previewed">{{ t('drive.recent.columns.previewedAt') }}</th>
              <th class="cloud-drive-recent__col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.spaceFileId"
              class="cloud-drive-recent__row"
              :class="{ 'cloud-drive-recent__row--selected': selectedIds.has(item.spaceFileId) }"
              @click="toggleSelect(item.spaceFileId)">
              <td class="cloud-drive-recent__col-check" @click.stop>
                <n-checkbox
                  :checked="selectedIds.has(item.spaceFileId)"
                  @update:checked="(checked) => setSelected(item.spaceFileId, checked)" />
              </td>
              <td class="cloud-drive-recent__col-name">
                <div class="cloud-drive-recent__file-name">
                  <span class="cloud-drive-recent__file-icon" @click.stop="onPreviewClick(item)">
                    <img
                      class="cloud-drive-recent__file-icon-img"
                      :src="fileIconSrc(item)"
                      :alt="item.fileName"
                      draggable="false" />
                  </span>
                  <span
                    class="cloud-drive-recent__file-name-text"
                    :title="item.fileName"
                    @click.stop="onPreviewClick(item)">
                    {{ item.fileName }}
                  </span>
                </div>
              </td>
              <td class="cloud-drive-recent__col-type">{{ getFileTypeLabel(item) }}</td>
              <td class="cloud-drive-recent__col-size">{{ getSizeLabel(item) }}</td>
              <td class="cloud-drive-recent__col-previewed">{{ formatPreviewedAt(item.previewedAt) }}</td>
              <td class="cloud-drive-recent__col-actions" @click.stop>
                <n-dropdown
                  trigger="click"
                  placement="bottom-end"
                  :options="rowMoreOptions"
                  @select="(key) => onRowMoreSelect(key, item)">
                  <n-button quaternary size="tiny">
                    <svg class="size-16px">
                      <use href="#more"></use>
                    </svg>
                  </n-button>
                </n-dropdown>
              </td>
            </tr>
          </tbody>
        </table>
      </n-spin>
    </div>
  </section>
</template>

<script setup lang="ts">
  import {
    clearSpaceRecentAccess,
    deleteSpaceRecentAccessByIds,
    querySpaceRecentAccessByUser,
    type DbSpaceRecentAccess
  } from '@/db/spaceRecentAccess'
  import { useUserStore } from '@/stores/user/user'
  import { createFilePreviewWindow } from '@/utils/desktop/window'
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
  import {
    formatPreviewLimit,
    isFilePreviewTooLarge,
    normalizeFileExtension,
    resolveFilePreviewConfig
  } from '@/utils/file/filePreview'
  import { recordSpaceFileRecentAccess } from '@/utils/file/spaceRecentAccess'
  import type { DropdownOption } from 'naive-ui'
  import { useI18n } from 'vue-i18n'

  interface Props {
    searchKeyword?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    searchKeyword: ''
  })

  const { t } = useI18n()
  const dialog = useDialog()
  const userStore = useUserStore()

  const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'heic', 'heif'])
  const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'])

  const itemList = ref<DbSpaceRecentAccess[]>([])
  const listLoading = ref(false)
  const removing = ref(false)
  const clearing = ref(false)
  const selectedIds = ref(new Set<string>())

  const filteredItems = computed(() => {
    const keyword = props.searchKeyword.trim().toLowerCase()
    if (!keyword) return itemList.value
    return itemList.value.filter((item) => item.fileName.toLowerCase().includes(keyword))
  })

  const showEmpty = computed(() => !listLoading.value && filteredItems.value.length === 0)
  const hasSelection = computed(() => selectedIds.value.size > 0)
  const allSelected = computed(() => {
    const list = filteredItems.value
    return list.length > 0 && list.every((item) => selectedIds.value.has(item.spaceFileId))
  })
  const someSelected = computed(() => filteredItems.value.some((item) => selectedIds.value.has(item.spaceFileId)))

  const rowMoreOptions = computed<DropdownOption[]>(() => [
    { label: () => t('drive.recent.actions.preview'), key: 'preview' },
    {
      label: () => t('drive.recent.actions.remove'),
      key: 'remove',
      props: { class: 'cloud-drive-recent__menu-item--danger' }
    }
  ])

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    return `${(bytes / 1024 / 1024 / 1024 / 1024).toFixed(1)} TB`
  }

  const fileIconSrc = (item: DbSpaceRecentAccess) => getDriveListFileIconUrl(item.fileName, false)

  const getSizeLabel = (item: DbSpaceRecentAccess) => formatBytes(item.fileSize)

  const getFileTypeLabel = (item: DbSpaceRecentAccess) => {
    const ext = (item.fileType || normalizeFileExtension(item.fileName, item.fileType) || '').trim().toLowerCase()
    if (!ext) return t('drive.files.types.file')
    if (IMAGE_EXTS.has(ext)) return t('drive.files.types.image')
    if (ext === 'pdf') return t('drive.files.types.pdf')
    if (ARCHIVE_EXTS.has(ext)) return t('drive.files.types.archive')
    return ext.toUpperCase()
  }

  const formatPreviewedAt = (iso: string) => {
    if (!iso) return ''
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const fetchList = () => {
    const userId = userStore.authInfo.userId
    if (!userId) {
      itemList.value = []
      return
    }
    listLoading.value = true
    querySpaceRecentAccessByUser(userId)
      .then((rows) => {
        itemList.value = rows
        selectedIds.value = new Set()
      })
      .catch(() => {
        itemList.value = []
      })
      .finally(() => {
        listLoading.value = false
      })
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedIds.value = next
  }

  const setSelected = (id: string, checked: boolean) => {
    const next = new Set(selectedIds.value)
    if (checked) next.add(id)
    else next.delete(id)
    selectedIds.value = next
  }

  const setAllSelected = (checked: boolean) => {
    const next = new Set(selectedIds.value)
    for (const item of filteredItems.value) {
      if (checked) next.add(item.spaceFileId)
      else next.delete(item.spaceFileId)
    }
    selectedIds.value = next
  }

  const onPreviewClick = (item: DbSpaceRecentAccess) => {
    const config = resolveFilePreviewConfig(item.fileName, item.fileType)
    if (!config) {
      const extension = normalizeFileExtension(item.fileName, item.fileType)
      window.$message.warning(
        extension === 'doc' ? t('filePreview.legacyWordUnsupported') : t('filePreview.unsupported')
      )
      return
    }
    if (isFilePreviewTooLarge(Number(item.fileSize), config)) {
      window.$message.warning(t('filePreview.tooLargeHint', { limit: formatPreviewLimit(config.maxBytes) }))
      return
    }
    if (!item.physicalStoragePath) {
      window.$message.error(t('filePreview.invalidUrl'))
      return
    }

    createFilePreviewWindow({
      id: item.spaceFileId,
      name: item.fileName,
      url: item.physicalStoragePath,
      type: config.extension,
      size: Number(item.fileSize) || 0
    })
      .then(() =>
        recordSpaceFileRecentAccess(userStore.authInfo.userId, {
          id: item.spaceFileId,
          fileName: item.fileName,
          fileType: item.fileType,
          fileSize: item.fileSize,
          physicalStoragePath: item.physicalStoragePath,
          parentId: item.parentId,
          path: item.path
        })
      )
      .then(() => fetchList())
      .catch(() => {
        window.$message.error(t('filePreview.openFailed'))
      })
  }

  const removeItems = (spaceFileIds: string[]) => {
    const userId = userStore.authInfo.userId
    if (!userId || spaceFileIds.length === 0) return Promise.resolve()
    removing.value = true
    return deleteSpaceRecentAccessByIds(userId, spaceFileIds)
      .then(() => {
        selectedIds.value = new Set()
        fetchList()
        window.$message.success(t('drive.recent.remove.success'))
      })
      .catch(() => {})
      .finally(() => {
        removing.value = false
      })
  }

  const confirmRemoveSelected = () => {
    const ids = [...selectedIds.value]
    if (ids.length === 0 || removing.value) return

    dialog.warning({
      title: t('drive.recent.remove.confirmTitle'),
      content: t('drive.recent.remove.confirmContent', { count: ids.length }),
      positiveText: t('drive.recent.remove.confirm'),
      negativeText: t('drive.recent.remove.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => removeItems(ids)
    })
  }

  const confirmClearRecent = () => {
    const userId = userStore.authInfo.userId
    if (!userId || itemList.value.length === 0 || clearing.value) return

    dialog.warning({
      title: t('drive.recent.clear.confirmTitle'),
      content: t('drive.recent.clear.confirmContent'),
      positiveText: t('drive.recent.clear.confirm'),
      negativeText: t('drive.recent.clear.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        clearing.value = true
        return clearSpaceRecentAccess(userId)
          .then(() => {
            selectedIds.value = new Set()
            itemList.value = []
            window.$message.success(t('drive.recent.clear.success'))
          })
          .catch(() => {})
          .finally(() => {
            clearing.value = false
          })
      }
    })
  }

  const onRowMoreSelect = (key: string | number, item: DbSpaceRecentAccess) => {
    if (key === 'preview') {
      onPreviewClick(item)
      return
    }
    if (key === 'remove') {
      removeItems([item.spaceFileId])
    }
  }

  watch(
    () => userStore.authInfo.userId,
    () => fetchList(),
    { immediate: true }
  )

  onActivated(() => {
    fetchList()
  })
</script>

<style scoped lang="scss">
  .cloud-drive-recent {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    height: 0;
    min-height: 0;
    margin-top: 0;

    &__header {
      flex-shrink: 0;
      margin-bottom: 18px;
      padding-bottom: 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 88%, transparent);
    }

    &__title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      color: var(--text-color);
      user-select: none;
      white-space: nowrap;
    }

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
      margin-bottom: 14px;
      min-width: 0;
    }

    &__hint {
      margin: 0;
      min-width: 0;
      flex: 1;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__toolbar {
      display: inline-flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 8px;
      flex-shrink: 0;
    }

    &__toolbar-divider {
      width: 1px;
      height: 16px;
      margin: 0 2px;
      background-color: var(--divider-color);
    }

    &__action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 30px;
      padding: 0 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        opacity 0.15s ease;

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    &__action-btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: currentColor;

      svg {
        display: block;
        width: 14px;
        height: 14px;
      }
    }

    &__action-btn-label {
      display: block;
      line-height: 12px;
      white-space: nowrap;
    }

    &__action-btn--outline {
      color: var(--text-color);
      background: var(--bg-muted-color);

      &:hover:not(:disabled) {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, var(--bg-muted-color));
      }
    }

    &__action-btn--danger {
      color: var(--red);
      background: color-mix(in srgb, var(--red) 10%, var(--bg-muted-color));

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--red) 16%, var(--bg-muted-color));
      }
    }

    &__table-wrap {
      flex: 1 1 0;
      height: 0;
      min-height: 0;
      border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
      border-radius: 10px;
      overflow-y: auto;
      overflow-x: auto;

      &::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      &::-webkit-scrollbar-thumb {
        border-radius: 3px;
        background: color-mix(in srgb, var(--text-secondary-color) 35%, transparent);
      }

      &::-webkit-scrollbar-thumb:hover {
        background: color-mix(in srgb, var(--text-secondary-color) 50%, transparent);
      }
    }

    &__spin {
      height: 100%;
      min-height: 280px;

      :deep(.n-spin-container),
      :deep(.n-spin-content) {
        height: 100%;
        min-height: 280px;
      }
    }

    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 280px;
      padding: 40px 20px;
      box-sizing: border-box;
      user-select: none;
    }

    &__empty-text {
      text-align: center;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary-color);

      p {
        margin: 0;
      }
    }

    &__table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 13px;

      th,
      td {
        padding: 10px 12px;
        text-align: left;
        vertical-align: middle;
        border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      }

      thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.3;
        color: var(--text-secondary-color);
        background-color: var(--bg-muted-color);
        user-select: none;
        box-shadow: 0 1px 0 color-mix(in srgb, var(--border-color) 55%, transparent);
      }

      tbody tr:last-child td {
        border-bottom: none;
      }
    }

    &__col-check {
      width: 44px;
      text-align: center;

      :deep(.n-checkbox) {
        display: inline-flex;
        vertical-align: middle;
      }
    }

    &__col-name {
      width: auto;
      overflow: hidden;
    }

    &__col-type {
      width: 100px;
      white-space: nowrap;
    }

    &__col-size {
      width: 96px;
    }

    &__col-previewed {
      width: 168px;
      white-space: nowrap;
    }

    &__col-actions {
      width: 44px;
      text-align: center;

      :deep(.n-button) {
        vertical-align: middle;
      }
    }

    &__row {
      cursor: pointer;
      transition: background-color 0.12s ease;

      &:hover {
        background-color: color-mix(in srgb, var(--primary-color) 12%, var(--bg-secondary-color));
      }

      &--selected {
        background-color: color-mix(in srgb, var(--primary-color) 8%, var(--bg-secondary-color));
      }
    }

    &__file-name {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      width: 100%;
      overflow: hidden;
    }

    &__file-name-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--text-color);
      cursor: pointer;
    }

    &__file-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      cursor: pointer;
    }

    &__file-icon-img {
      display: block;
      width: 24px;
      height: 24px;
      object-fit: contain;
      object-position: center;
      user-select: none;
      pointer-events: none;
    }
  }

  @media (max-width: 900px) {
    .cloud-drive-recent__action-btn-label {
      display: none;
    }

    .cloud-drive-recent__action-btn {
      width: 30px;
      padding: 0;
    }

    .cloud-drive-recent__action-btn:last-child .cloud-drive-recent__action-btn-label {
      display: block;
    }

    .cloud-drive-recent__action-btn:last-child {
      width: auto;
      padding: 0 12px;
    }
  }

  :global(.n-dropdown-menu .cloud-drive-recent__menu-item--danger) {
    color: var(--red);
  }

  :global(.n-dropdown-menu .cloud-drive-recent__menu-item--danger:hover) {
    color: var(--red) !important;
  }
</style>
