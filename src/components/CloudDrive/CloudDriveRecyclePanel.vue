<template>
  <section class="cloud-drive-recycle">
    <header class="cloud-drive-recycle__header">
      <h1 class="cloud-drive-recycle__title">{{ t('drive.recycle.title') }}</h1>
    </header>

    <div class="cloud-drive-recycle__head">
      <p class="cloud-drive-recycle__hint">{{ t('drive.recycle.hint') }}</p>
      <div class="cloud-drive-recycle__toolbar">
        <button
          type="button"
          class="cloud-drive-recycle__action-btn cloud-drive-recycle__action-btn--outline"
          :disabled="!hasSelection || restoring"
          :title="t('drive.recycle.actions.restore')"
          @click="confirmRestoreSelected()">
          <svg class="cloud-drive-recycle__action-btn-icon" aria-hidden="true">
            <use href="#undo"></use>
          </svg>
          <span class="cloud-drive-recycle__action-btn-label">{{ t('drive.recycle.actions.restore') }}</span>
        </button>
        <button
          type="button"
          class="cloud-drive-recycle__action-btn cloud-drive-recycle__action-btn--danger"
          :disabled="!hasSelection || deleting"
          :title="t('drive.recycle.actions.delete')"
          @click="confirmDeleteSelected()">
          <svg class="cloud-drive-recycle__action-btn-icon" aria-hidden="true">
            <use href="#trash"></use>
          </svg>
          <span class="cloud-drive-recycle__action-btn-label">{{ t('drive.recycle.actions.delete') }}</span>
        </button>
        <span class="cloud-drive-recycle__toolbar-divider"></span>
        <button
          type="button"
          class="cloud-drive-recycle__action-btn cloud-drive-recycle__action-btn--outline"
          :disabled="itemList.length === 0 || clearing"
          :title="t('drive.recycle.actions.clear')"
          @click="confirmClearRecycle">
          <span class="cloud-drive-recycle__action-btn-label">{{ t('drive.recycle.actions.clear') }}</span>
        </button>
      </div>
    </div>

    <div class="cloud-drive-recycle__table-wrap">
      <n-spin :show="listLoading" class="cloud-drive-recycle__spin">
        <div v-if="showEmpty" class="cloud-drive-recycle__empty">
          <div class="cloud-drive-recycle__empty-text">
            <p>{{ t('drive.recycle.empty') }}</p>
          </div>
        </div>
        <table v-else class="cloud-drive-recycle__table">
          <thead>
            <tr>
              <th class="cloud-drive-recycle__col-check">
                <n-checkbox
                  :checked="allSelected"
                  :indeterminate="someSelected && !allSelected"
                  @update:checked="setAllSelected" />
              </th>
              <th class="cloud-drive-recycle__col-name">{{ t('drive.recycle.columns.name') }}</th>
              <th class="cloud-drive-recycle__col-expire">{{ t('drive.recycle.columns.expire') }}</th>
              <th class="cloud-drive-recycle__col-size">{{ t('drive.recycle.columns.size') }}</th>
              <th class="cloud-drive-recycle__col-deleted">{{ t('drive.recycle.columns.deletedAt') }}</th>
              <th class="cloud-drive-recycle__col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="cloud-drive-recycle__row"
              :class="{ 'cloud-drive-recycle__row--selected': selectedIds.has(item.id) }"
              @click="toggleSelect(item.id)">
              <td class="cloud-drive-recycle__col-check" @click.stop>
                <n-checkbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(checked) => setSelected(item.id, checked)" />
              </td>
              <td class="cloud-drive-recycle__col-name">
                <div class="cloud-drive-recycle__file-name">
                  <span class="cloud-drive-recycle__file-icon">
                    <img
                      class="cloud-drive-recycle__file-icon-img"
                      :src="fileIconSrc(item)"
                      :alt="item.fileName"
                      draggable="false" />
                  </span>
                  <span class="cloud-drive-recycle__file-name-text" :title="item.fileName">{{ item.fileName }}</span>
                </div>
              </td>
              <td class="cloud-drive-recycle__col-expire">{{ formatExpireRemain(item.expireAt) }}</td>
              <td class="cloud-drive-recycle__col-size">{{ getSizeLabel(item) }}</td>
              <td class="cloud-drive-recycle__col-deleted">{{ item.createdAt }}</td>
              <td class="cloud-drive-recycle__col-actions" @click.stop>
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
  import { spaceRecycleApi } from '@/api'
  import type { SpaceRecycle } from '@/types/api/spaceRecycle'
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
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

  const emit = defineEmits<{
    restored: []
    deleted: []
    cleared: []
  }>()

  const itemList = ref<SpaceRecycle[]>([])
  const listLoading = ref(false)
  const restoring = ref(false)
  const deleting = ref(false)
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
    return list.length > 0 && list.every((item) => selectedIds.value.has(item.id))
  })
  const someSelected = computed(() => filteredItems.value.some((item) => selectedIds.value.has(item.id)))

  const rowMoreOptions = computed<DropdownOption[]>(() => [
    { label: () => t('drive.recycle.actions.restore'), key: 'restore' },
    {
      label: () => t('drive.recycle.actions.delete'),
      key: 'delete',
      props: { class: 'cloud-drive-recycle__menu-item--danger' }
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

  const fileIconSrc = (item: SpaceRecycle) => getDriveListFileIconUrl(item.fileName, item.isDir)

  const getSizeLabel = (item: SpaceRecycle) => {
    if (item.isDir) return '-'
    return formatBytes(item.fileSize)
  }

  const formatExpireRemain = (expireAt: string) => {
    const expireTime = new Date(expireAt.replace(/-/g, '/')).getTime()
    if (!Number.isFinite(expireTime)) return expireAt

    const remainMs = expireTime - Date.now()
    if (remainMs <= 0) return t('drive.recycle.expireRemain.expired')

    const minuteMs = 60 * 1000
    const hourMs = 60 * minuteMs
    const dayMs = 24 * hourMs

    if (remainMs >= dayMs) {
      return t('drive.recycle.expireRemain.days', { count: Math.floor(remainMs / dayMs) })
    }
    if (remainMs >= hourMs) {
      return t('drive.recycle.expireRemain.hours', { count: Math.floor(remainMs / hourMs) })
    }
    return t('drive.recycle.expireRemain.minutes', { count: Math.max(1, Math.floor(remainMs / minuteMs)) })
  }

  const fetchRecycleList = () => {
    listLoading.value = true
    spaceRecycleApi
      .listSpaceUserRecycle()
      .then((res) => {
        if (res.code === 0 && res.data) {
          itemList.value = res.data
          selectedIds.value = new Set()
        } else {
          window.$message.error(res.msg)
        }
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
      if (checked) next.add(item.id)
      else next.delete(item.id)
    }
    selectedIds.value = next
  }

  const confirmRestoreSelected = (ids?: string[]) => {
    const spaceRecycleIds = ids ?? [...selectedIds.value]
    if (spaceRecycleIds.length === 0 || restoring.value) return

    dialog.warning({
      title: t('drive.recycle.restore.confirmTitle'),
      content: t('drive.recycle.restore.confirmContent', { count: spaceRecycleIds.length }),
      positiveText: t('drive.recycle.restore.confirm'),
      negativeText: t('drive.recycle.restore.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'primary' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        restoring.value = true
        return spaceRecycleApi
          .restoreSpaceUserRecycle({ spaceRecycleIds })
          .then((res) => {
            if (res.code === 0) {
              selectedIds.value = new Set()
              fetchRecycleList()
              emit('restored')
              window.$message.success(t('drive.recycle.restore.success'))
            } else {
              window.$message.error(res.msg)
            }
          })
          .finally(() => {
            restoring.value = false
          })
      }
    })
  }

  const confirmDeleteSelected = (ids?: string[]) => {
    const spaceRecycleIds = ids ?? [...selectedIds.value]
    if (spaceRecycleIds.length === 0 || deleting.value) return

    dialog.warning({
      title: t('drive.recycle.delete.confirmTitle'),
      content: t('drive.recycle.delete.confirmContent', { count: spaceRecycleIds.length }),
      positiveText: t('drive.recycle.delete.confirm'),
      negativeText: t('drive.recycle.delete.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        deleting.value = true
        return spaceRecycleApi
          .deleteSpaceUserRecycle({ spaceRecycleIds })
          .then((res) => {
            if (res.code === 0) {
              selectedIds.value = new Set()
              fetchRecycleList()
              emit('deleted')
              window.$message.success(t('drive.recycle.delete.success'))
            } else {
              window.$message.error(res.msg)
            }
          })
          .finally(() => {
            deleting.value = false
          })
      }
    })
  }

  const onRowMoreSelect = (key: string | number, item: SpaceRecycle) => {
    if (key === 'restore') {
      confirmRestoreSelected([item.id])
      return
    }
    if (key === 'delete') {
      confirmDeleteSelected([item.id])
    }
  }

  const confirmClearRecycle = () => {
    if (itemList.value.length === 0 || clearing.value) return

    dialog.warning({
      title: t('drive.recycle.clear.confirmTitle'),
      content: t('drive.recycle.clear.confirmContent'),
      positiveText: t('drive.recycle.clear.confirm'),
      negativeText: t('drive.recycle.clear.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        clearing.value = true
        return spaceRecycleApi
          .clearSpaceUserRecycle()
          .then((res) => {
            if (res.code === 0) {
              selectedIds.value = new Set()
              fetchRecycleList()
              emit('cleared')
              window.$message.success(t('drive.recycle.clear.success'))
            } else {
              window.$message.error(res.msg)
            }
          })
          .finally(() => {
            clearing.value = false
          })
      }
    })
  }

  onMounted(() => {
    fetchRecycleList()
  })

  onActivated(() => {
    fetchRecycleList()
  })
</script>

<style scoped lang="scss">
  .cloud-drive-recycle {
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

    &__col-expire {
      width: 168px;
      white-space: nowrap;
    }

    &__col-size {
      width: 96px;
    }

    &__col-deleted {
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
    }

    &__file-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
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
    .cloud-drive-recycle__action-btn-label {
      display: none;
    }

    .cloud-drive-recycle__action-btn {
      width: 30px;
      padding: 0;
    }

    .cloud-drive-recycle__action-btn:last-child .cloud-drive-recycle__action-btn-label {
      display: block;
    }

    .cloud-drive-recycle__action-btn:last-child {
      width: auto;
      padding: 0 12px;
    }
  }

  :global(.n-dropdown-menu .cloud-drive-recycle__menu-item--danger) {
    color: var(--red);
  }

  :global(.n-dropdown-menu .cloud-drive-recycle__menu-item--danger:hover) {
    color: var(--red) !important;
  }
</style>
