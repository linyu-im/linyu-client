<template>
  <div ref="cloudDriveRef" class="cloud-drive">
    <Split
      :key="siderCompact ? 'compact' : 'expanded'"
      :default-size="splitDefaultSize"
      :min-size="splitMinSize"
      :max-size="splitMaxSize">
      <template #first>
        <aside class="cloud-drive__sider" :class="{ 'cloud-drive__sider--compact': siderCompact }">
          <n-input
            v-if="!siderCompact"
            v-model:value="searchKeyword"
            size="small"
            class="cloud-drive__search"
            :placeholder="t('drive.searchPlaceholder')"
            clearable>
            <template #prefix>
              <svg class="size-16px text-[var(--text-secondary-color)]">
                <use href="#search"></use>
              </svg>
            </template>
          </n-input>
          <div v-else class="cloud-drive__search-compact">
            <n-popover trigger="click" placement="right" :show-arrow="false">
              <template #trigger>
                <n-tooltip placement="right" :show-arrow="false">
                  <template #trigger>
                    <button type="button" class="cloud-drive__nav-item cloud-drive__nav-item--icon-only">
                      <svg class="size-18px shrink-0 text-[var(--text-secondary-color)]">
                        <use href="#search"></use>
                      </svg>
                    </button>
                  </template>
                  {{ t('drive.searchPlaceholder') }}
                </n-tooltip>
              </template>
              <n-input
                v-model:value="searchKeyword"
                size="small"
                :placeholder="t('drive.searchPlaceholder')"
                clearable
                style="width: 200px" />
            </n-popover>
          </div>

          <n-scrollbar class="cloud-drive__sider-scroll">
            <nav class="cloud-drive__nav">
              <n-tooltip placement="right" :show-arrow="false" :disabled="!siderCompact">
                <template #trigger>
                  <button
                    type="button"
                    class="cloud-drive__nav-item"
                    :class="{ active: activeMenu === 'myDrive', 'cloud-drive__nav-item--icon-only': siderCompact }"
                    @click="activeMenu = 'myDrive'">
                    <svg class="size-18px shrink-0">
                      <use href="#cloud"></use>
                    </svg>
                    <span v-show="!siderCompact">{{ t('drive.sidebar.myDrive') }}</span>
                  </button>
                </template>
                {{ t('drive.sidebar.myDrive') }}
              </n-tooltip>

              <div class="cloud-drive__nav-section" :class="{ 'cloud-drive__nav-section--compact': siderCompact }">
                {{ t('drive.sidebar.shortcuts') }}
              </div>

              <n-tooltip placement="right" :show-arrow="false" :disabled="!siderCompact">
                <template #trigger>
                  <button
                    type="button"
                    class="cloud-drive__nav-item"
                    :class="{ active: activeMenu === 'recent', 'cloud-drive__nav-item--icon-only': siderCompact }"
                    @click="activeMenu = 'recent'">
                    <svg class="size-18px shrink-0">
                      <use href="#clock"></use>
                    </svg>
                    <span v-show="!siderCompact">{{ t('drive.sidebar.recent') }}</span>
                  </button>
                </template>
                {{ t('drive.sidebar.recent') }}
              </n-tooltip>

              <n-tooltip placement="right" :show-arrow="false" :disabled="!siderCompact">
                <template #trigger>
                  <button
                    type="button"
                    class="cloud-drive__nav-item"
                    :class="{ active: activeMenu === 'deleted', 'cloud-drive__nav-item--icon-only': siderCompact }"
                    @click="activeMenu = 'deleted'">
                    <svg class="size-18px shrink-0">
                      <use href="#recycle"></use>
                    </svg>
                    <span v-show="!siderCompact">{{ t('drive.sidebar.deleted') }}</span>
                  </button>
                </template>
                {{ t('drive.sidebar.deleted') }}
              </n-tooltip>
            </nav>
          </n-scrollbar>
        </aside>
      </template>

      <template #second>
        <div class="cloud-drive__main">
          <div class="cloud-drive__main-body">
            <div class="cloud-drive__content">
              <header class="cloud-drive__header">
                <div class="cloud-drive__header-row">
                  <div class="cloud-drive__header-left">
                    <h1 class="cloud-drive__title">{{ t('drive.title') }}</h1>
                    <div class="cloud-drive__storage">
                      <span class="cloud-drive__storage-label">{{ t('drive.storage.label') }}</span>
                      <n-progress
                        class="cloud-drive__storage-bar"
                        type="line"
                        :percentage="storagePercent"
                        :show-indicator="false"
                        :height="6"
                        :border-radius="3"
                        color="var(--primary-color)" />
                      <span class="cloud-drive__storage-text">
                        {{ t('drive.storage.summary', { used: storageUsed, total: storageTotal }) }}
                      </span>
                      <span class="cloud-drive__storage-percent">{{ storagePercent }}%</span>
                    </div>
                  </div>
                </div>
              </header>

              <section class="cloud-drive__section">
                <div class="cloud-drive__categories">
                  <button
                    v-for="category in categories"
                    :key="category.key"
                    type="button"
                    class="cloud-drive__category"
                    :class="`cloud-drive__category--${category.key}`">
                    <span class="cloud-drive__category-icon" aria-hidden="true">
                      <svg class="size-17px">
                        <use :href="category.icon"></use>
                      </svg>
                    </span>
                    <span class="cloud-drive__category-info">
                      <span class="cloud-drive__category-name">{{ t(category.labelKey) }}</span>
                      <span class="cloud-drive__category-meta">{{ category.count }} · {{ category.size }}</span>
                    </span>
                  </button>
                </div>
              </section>

              <section class="cloud-drive__section cloud-drive__section--files">
                <div class="cloud-drive__files-head">
                  <nav class="cloud-drive__path" :aria-label="t('drive.path.label')">
                    <template v-for="(item, index) in displayPathItems" :key="item.itemKey">
                      <svg v-if="index > 0" class="cloud-drive__path-sep size-12px" aria-hidden="true">
                        <use href="#right-arrow"></use>
                      </svg>
                      <n-dropdown
                        v-if="isPathEllipsis(item)"
                        trigger="click"
                        placement="bottom-start"
                        :options="ellipsisPathOptions"
                        @select="navigateToSegment">
                        <button type="button" class="cloud-drive__path-ellipsis" :title="t('drive.path.collapsed')">
                          <svg class="size-14px" aria-hidden="true">
                            <use href="#more"></use>
                          </svg>
                        </button>
                      </n-dropdown>
                      <button
                        v-else-if="!item.current"
                        type="button"
                        class="cloud-drive__path-link"
                        :title="item.label"
                        @click="navigateToSegment(item.id)">
                        {{ item.label }}
                      </button>
                      <span v-else class="cloud-drive__path-current" :title="item.label">{{ item.label }}</span>
                    </template>
                  </nav>
                  <div class="cloud-drive__files-toolbar">
                    <button type="button" class="cloud-drive__action-btn cloud-drive__action-btn--primary">
                      <svg class="cloud-drive__action-btn-icon" aria-hidden="true">
                        <use href="#plus"></use>
                      </svg>
                      <span class="cloud-drive__action-btn-label">{{ t('drive.actions.upload') }}</span>
                    </button>
                    <button type="button" class="cloud-drive__action-btn cloud-drive__action-btn--outline">
                      <svg class="cloud-drive__action-btn-icon" aria-hidden="true">
                        <use href="#folder"></use>
                      </svg>
                      <span class="cloud-drive__action-btn-label">{{ t('drive.actions.newFolder') }}</span>
                    </button>
                    <template v-if="hasFileSelection">
                      <span class="cloud-drive__toolbar-divider"></span>
                      <button type="button" class="cloud-drive__toolbar-btn" :title="t('drive.actions.share')">
                        <svg class="size-16px">
                          <use href="#share"></use>
                        </svg>
                      </button>
                      <button type="button" class="cloud-drive__toolbar-btn" :title="t('drive.actions.download')">
                        <svg class="size-16px">
                          <use href="#download"></use>
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="cloud-drive__toolbar-btn cloud-drive__toolbar-btn--danger"
                        :title="t('drive.actions.delete')">
                        <svg class="size-16px">
                          <use href="#trash"></use>
                        </svg>
                      </button>
                    </template>
                    <span class="cloud-drive__toolbar-divider"></span>
                    <button
                      type="button"
                      class="cloud-drive__toolbar-btn"
                      :class="{ 'cloud-drive__toolbar-btn--active': viewMode === 'list' }"
                      :title="t('drive.view.list')"
                      @click="viewMode = 'list'">
                      <svg class="size-16px">
                        <use href="#list"></use>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="cloud-drive__toolbar-btn"
                      :class="{ 'cloud-drive__toolbar-btn--active': viewMode === 'grid' }"
                      :title="t('drive.view.grid')"
                      @click="viewMode = 'grid'">
                      <svg class="size-16px">
                        <use href="#application"></use>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="cloud-drive__table-wrap">
                  <table class="cloud-drive__table">
                    <thead>
                      <tr>
                        <th class="cloud-drive__col-check">
                          <n-checkbox
                            :checked="allFilesSelected"
                            :indeterminate="someFilesSelected && !allFilesSelected"
                            @update:checked="setAllFilesSelected" />
                        </th>
                        <th>{{ t('drive.files.columns.name') }}</th>
                        <th>{{ t('drive.files.columns.type') }}</th>
                        <th>{{ t('drive.files.columns.modified') }}</th>
                        <th>{{ t('drive.files.columns.size') }}</th>
                        <th class="cloud-drive__col-owner">{{ t('drive.files.columns.owner') }}</th>
                        <th class="cloud-drive__col-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="file in filteredFiles"
                        :key="file.id"
                        class="cloud-drive__row"
                        :class="{
                          'cloud-drive__row--selected': selectedFileIds.has(file.id),
                          'cloud-drive__row--folder': file.kind === 'folder'
                        }"
                        @click="onRowClick(file)"
                        @dblclick="onRowDblClick(file)">
                        <td class="cloud-drive__col-check" @click.stop>
                          <n-checkbox
                            :checked="selectedFileIds.has(file.id)"
                            @update:checked="(checked) => setFileSelected(file.id, checked)" />
                        </td>
                        <td>
                          <div class="cloud-drive__file-name">
                            <span class="cloud-drive__file-icon">
                              <img
                                class="cloud-drive__file-icon-img"
                                :src="fileIconSrc(file)"
                                :alt="file.name"
                                draggable="false" />
                            </span>
                            <span
                              class="truncate"
                              :class="{ 'cloud-drive__file-name-text--folder': file.kind === 'folder' }">
                              {{ file.name }}
                            </span>
                          </div>
                        </td>
                        <td>{{ t(file.typeKey) }}</td>
                        <td>{{ file.modifiedAt }}</td>
                        <td>{{ file.size }}</td>
                        <td class="cloud-drive__col-owner">
                          <n-avatar round :size="24" class="cloud-drive__owner-avatar">
                            {{ file.ownerInitial }}
                          </n-avatar>
                        </td>
                        <td class="cloud-drive__col-actions">
                          <n-button quaternary size="tiny" @click.stop>
                            <svg class="size-16px">
                              <use href="#more"></use>
                            </svg>
                          </n-button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      </template>
    </Split>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'drive' })
  import { getDriveListFileIconUrl } from '@/utils/file/fileIcon'
  import { useI18n } from 'vue-i18n'

  type SidebarMenu = 'myDrive' | 'recent' | 'deleted'
  type ViewMode = 'list' | 'grid'
  type FileKind = 'folder' | 'image' | 'pdf' | 'archive'

  interface DriveCategory {
    key: string
    icon: string
    labelKey: string
    count: string
    size: string
  }

  interface DriveFile {
    id: string
    parentId: string | null
    name: string
    kind: FileKind
    typeKey: string
    modifiedAt: string
    size: string
    ownerInitial: string
  }

  interface PathSegment {
    id: string
    label: string
    current?: boolean
  }

  type PathSegmentDisplay = PathSegment & { itemKey: string }

  type PathEllipsisDisplay = {
    itemKey: 'ellipsis'
    type: 'ellipsis'
    hidden: PathSegment[]
  }

  type DisplayPathItem = PathSegmentDisplay | PathEllipsisDisplay

  const PATH_MAX_VISIBLE = 4
  const PATH_HEAD_COUNT = 1
  const PATH_TAIL_COUNT = 2
  const PATH_EXCLUDED_IDS = new Set(['drive'])

  const { t } = useI18n()

  const SIDER_WIDTH_EXPANDED = 220
  const SIDER_WIDTH_COMPACT = 60
  const MAIN_MIN_WIDTH = 680

  const cloudDriveRef = ref<HTMLElement | null>(null)
  const siderCompact = ref(false)

  const splitDefaultSize = computed(() => (siderCompact.value ? SIDER_WIDTH_COMPACT : SIDER_WIDTH_EXPANDED))
  const splitMinSize = computed(() => (siderCompact.value ? SIDER_WIDTH_COMPACT : 160))
  const splitMaxSize = computed(() => (siderCompact.value ? SIDER_WIDTH_COMPACT : 280))

  const searchKeyword = ref('')
  const activeMenu = ref<SidebarMenu>('myDrive')
  const viewMode = ref<ViewMode>('list')
  const selectedFileIds = ref(new Set<string>())
  const currentFolderId = ref<string | null>(null)

  const storageUsed = '15.2 GB'
  const storageTotal = '50 GB'
  const storagePercent = 30

  const normalizePathSegments = (segments: PathSegment[]) =>
    segments.filter((segment) => !PATH_EXCLUDED_IDS.has(segment.id))

  const pathSegments = computed<PathSegment[]>(() => {
    if (currentFolderId.value === null) {
      return [{ id: 'root', label: t('drive.path.allFiles'), current: true }]
    }

    const chain: PathSegment[] = []
    let folderId: string | null = currentFolderId.value
    while (folderId) {
      const folder = allFiles.value.find((item) => item.id === folderId && item.kind === 'folder')
      if (!folder) break
      chain.unshift({ id: folder.id, label: folder.name })
      folderId = folder.parentId
    }

    return normalizePathSegments([
      { id: 'root', label: t('drive.path.allFiles') },
      ...chain.map((segment, index) => ({
        ...segment,
        current: index === chain.length - 1
      }))
    ])
  })

  const displayPathItems = computed<DisplayPathItem[]>(() => {
    const segments = normalizePathSegments(pathSegments.value)
    const mapped: PathSegmentDisplay[] = segments.map((segment) => ({
      ...segment,
      itemKey: segment.id
    }))

    if (segments.length <= PATH_MAX_VISIBLE) return mapped

    const head = mapped.slice(0, PATH_HEAD_COUNT)
    const tail = mapped.slice(-PATH_TAIL_COUNT)
    const hidden = mapped.slice(PATH_HEAD_COUNT, -PATH_TAIL_COUNT)
    const ellipsis: PathEllipsisDisplay = { itemKey: 'ellipsis', type: 'ellipsis', hidden }

    return [...head, ellipsis, ...tail]
  })

  const ellipsisPathOptions = computed(() => {
    const ellipsis = displayPathItems.value.find((item) => isPathEllipsis(item))
    if (!ellipsis) return []
    return ellipsis.hidden.map((segment) => ({
      label: segment.label,
      key: segment.id
    }))
  })

  const isPathEllipsis = (item: DisplayPathItem): item is PathEllipsisDisplay => item.itemKey === 'ellipsis'

  const categories: DriveCategory[] = [
    { key: 'images', icon: '#image', labelKey: 'drive.categories.images', count: '1.2k', size: '15.4 GB' },
    { key: 'videos', icon: '#video', labelKey: 'drive.categories.videos', count: '154', size: '28.2 GB' },
    { key: 'documents', icon: '#document', labelKey: 'drive.categories.documents', count: '842', size: '4.2 GB' },
    { key: 'audio', icon: '#voice', labelKey: 'drive.categories.audio', count: '56', size: '1.8 GB' }
  ]

  const allFiles = ref<DriveFile[]>([
    {
      id: 'file-1',
      parentId: null,
      name: '工作文档',
      kind: 'folder',
      typeKey: 'drive.files.types.folder',
      modifiedAt: '2026-01-14 15:21',
      size: '-',
      ownerInitial: 'H'
    },
    {
      id: 'file-2',
      parentId: null,
      name: '项目背景.jpg',
      kind: 'image',
      typeKey: 'drive.files.types.image',
      modifiedAt: '2026-01-13 10:05',
      size: '2.4 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-3',
      parentId: null,
      name: '2023年度财务汇报.pdf',
      kind: 'pdf',
      typeKey: 'drive.files.types.pdf',
      modifiedAt: '2026-01-10 09:30',
      size: '8.1 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-4',
      parentId: null,
      name: '客户端资源包_v2.0.zip',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-08 18:42',
      size: '126 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-4',
      parentId: null,
      name: '客户端资源包_v2.0.zip',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-08 18:42',
      size: '126 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-4',
      parentId: null,
      name: '客户端资源包_v2.0.zip',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-08 18:42',
      size: '126 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-4',
      parentId: null,
      name: '客户端资源包_v2.0.zip',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-08 18:42',
      size: '126 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-4',
      parentId: null,
      name: '客户端资源包_v2.0.zip',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-08 18:42',
      size: '126 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-4',
      parentId: null,
      name: '客户端资源包_v2.0.zip',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-08 18:42',
      size: '126 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-1',
      parentId: 'file-1',
      name: 'Q1 工作总结.docx',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-12 11:20',
      size: '1.2 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-2',
      parentId: 'file-1',
      name: '会议纪要',
      kind: 'folder',
      typeKey: 'drive.files.types.folder',
      modifiedAt: '2026-01-11 09:15',
      size: '-',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-3',
      parentId: 'file-1',
      name: '团队合影.jpg',
      kind: 'image',
      typeKey: 'drive.files.types.image',
      modifiedAt: '2026-01-09 16:40',
      size: '3.8 MB',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-2-1',
      parentId: 'file-1-2',
      name: '1月例会.pdf',
      kind: 'pdf',
      typeKey: 'drive.files.types.pdf',
      modifiedAt: '2026-01-08 14:00',
      size: '520 KB',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-2-2',
      parentId: 'file-1-2',
      name: '2月例会.pdf',
      kind: 'pdf',
      typeKey: 'drive.files.types.pdf',
      modifiedAt: '2026-02-08 14:00',
      size: '480 KB',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-2-3',
      parentId: 'file-1-2',
      name: '2026年',
      kind: 'folder',
      typeKey: 'drive.files.types.folder',
      modifiedAt: '2026-01-07 10:00',
      size: '-',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-2-3-1',
      parentId: 'file-1-2-3',
      name: 'Q1',
      kind: 'folder',
      typeKey: 'drive.files.types.folder',
      modifiedAt: '2026-01-06 09:00',
      size: '-',
      ownerInitial: 'H'
    },
    {
      id: 'file-1-2-3-1-1',
      parentId: 'file-1-2-3-1',
      name: '周报复盘.docx',
      kind: 'archive',
      typeKey: 'drive.files.types.archive',
      modifiedAt: '2026-01-05 18:30',
      size: '860 KB',
      ownerInitial: 'H'
    }
  ])

  const currentFiles = computed(() => allFiles.value.filter((file) => file.parentId === currentFolderId.value))

  const filteredFiles = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    const list = keyword
      ? currentFiles.value.filter((file) => file.name.toLowerCase().includes(keyword))
      : currentFiles.value
    return list
  })

  const allFilesSelected = computed(() => {
    const list = filteredFiles.value
    return list.length > 0 && list.every((file) => selectedFileIds.value.has(file.id))
  })

  const someFilesSelected = computed(() => filteredFiles.value.some((file) => selectedFileIds.value.has(file.id)))

  const hasFileSelection = computed(() => selectedFileIds.value.size > 0)

  const fileIconSrc = (file: DriveFile) => getDriveListFileIconUrl(file.name, file.kind === 'folder')

  const enterFolder = (folderId: string) => {
    const folder = allFiles.value.find((item) => item.id === folderId && item.kind === 'folder')
    if (!folder) return
    currentFolderId.value = folderId
    selectedFileIds.value = new Set()
  }

  const navigateToSegment = (segmentId: string) => {
    if (segmentId === 'root') {
      currentFolderId.value = null
    } else {
      currentFolderId.value = segmentId
    }
    selectedFileIds.value = new Set()
  }

  const onRowClick = (file: DriveFile) => {
    if (file.kind === 'folder') {
      enterFolder(file.id)
      return
    }
    toggleFileSelect(file.id)
  }

  const onRowDblClick = (file: DriveFile) => {
    if (file.kind === 'folder') enterFolder(file.id)
  }

  const toggleFileSelect = (id: string) => {
    const next = new Set(selectedFileIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedFileIds.value = next
  }

  const setFileSelected = (id: string, checked: boolean) => {
    const next = new Set(selectedFileIds.value)
    if (checked) next.add(id)
    else next.delete(id)
    selectedFileIds.value = next
  }

  const setAllFilesSelected = (checked: boolean) => {
    const next = new Set(selectedFileIds.value)
    for (const file of filteredFiles.value) {
      if (checked) next.add(file.id)
      else next.delete(file.id)
    }
    selectedFileIds.value = next
  }

  const updateSiderCompact = (containerWidth: number) => {
    siderCompact.value = containerWidth < MAIN_MIN_WIDTH + SIDER_WIDTH_EXPANDED + 16
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    const el = cloudDriveRef.value
    if (!el) return

    updateSiderCompact(el.clientWidth)
    resizeObserver = new ResizeObserver(([entry]) => {
      updateSiderCompact(entry.contentRect.width)
    })
    resizeObserver.observe(el)
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })
</script>

<style scoped lang="scss">
  .cloud-drive {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background-color: var(--bg-secondary-color);

    :deep(.split) {
      flex: 1;
      min-height: 0;
    }

    &__sider {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      padding: 14px 12px 12px;
      background-color: var(--bg-secondary-color);
      border-right: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      box-sizing: border-box;

      &--compact {
        padding: 10px 6px;
        align-items: center;
        border-right: none;
      }
    }

    &__search {
      flex-shrink: 0;
      margin-bottom: 12px;
      width: 100%;
    }

    &__search-compact {
      display: flex;
      justify-content: center;
      width: 100%;
      margin-bottom: 12px;
      flex-shrink: 0;

      :deep(.n-tooltip),
      :deep(.n-tooltip-trigger) {
        display: flex;
        justify-content: center;
      }
    }

    &__sider-scroll {
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    &__nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    &__nav-section {
      margin: 10px 10px 4px;
      font-size: 11px;
      color: var(--text-secondary-color);
      user-select: none;

      &--compact {
        width: 28px;
        height: 1px;
        margin: 8px auto;
        padding: 0;
        font-size: 0;
        background-color: var(--divider-color);
        overflow: hidden;
      }
    }

    &__nav-item {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--text-secondary-color);
      font-size: 14px;
      cursor: pointer;
      text-align: left;
      user-select: none;
      transition: background-color 0.15s ease;

      &:hover {
        background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
      }

      &.active {
        background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
        color: var(--primary-color);
      }

      &--icon-only {
        width: 36px;
        height: 36px;
        min-width: 36px;
        padding: 0;
        justify-content: center;
        gap: 0;
        box-sizing: border-box;
        flex-shrink: 0;
      }
    }

    &__sider--compact &__nav {
      align-items: center;
      width: 100%;
      gap: 6px;
      padding: 0 1px;
      box-sizing: border-box;
    }

    &__sider--compact &__sider-scroll {
      :deep(.n-scrollbar-container),
      :deep(.n-scrollbar-content) {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
      }
    }

    &__sider--compact :deep(.n-tooltip),
    &__sider--compact :deep(.n-tooltip-trigger) {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    &__sider-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: 10px;
      flex-shrink: 0;
    }

    &__status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &--primary {
        background-color: var(--primary-color);
      }

      &--danger {
        background-color: var(--red);
      }
    }

    &__main {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      min-width: 0;
      min-height: 0;
      background-color: var(--bg-secondary-color);
      overflow: hidden;
    }

    &__main-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    &__content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      min-width: 680px;
      padding: 20px 24px 24px;
      box-sizing: border-box;
      overflow-x: auto;
      overflow-y: hidden;
    }

    &__header {
      flex-shrink: 0;
      margin-bottom: 18px;
      padding-bottom: 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 88%, transparent);
    }

    &__header-row {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    &__header-left {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      min-width: 0;
    }

    &__title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      color: var(--text-color);
      user-select: none;
      flex-shrink: 0;
      white-space: nowrap;
    }

    &__path {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
      height: 28px;
      min-height: 28px;
      box-sizing: border-box;
      overflow: hidden;
      user-select: none;

      :deep(.n-dropdown) {
        display: inline-flex;
        align-items: center;
        height: 28px;
        flex-shrink: 0;
      }
    }

    &__path-sep {
      flex-shrink: 0;
      color: var(--text-secondary-color);
    }

    &__path-link {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0;
      border: none;
      background: none;
      max-width: 140px;
      font-size: 15px;
      font-weight: 500;
      line-height: 1;
      color: var(--text-secondary-color);
      cursor: pointer;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      flex-shrink: 1;
      min-width: 0;
      box-sizing: border-box;
      transition: color 0.12s ease;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__path-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      border-radius: 6px;
      background: var(--bg-muted-color);
      color: var(--text-secondary-color);
      cursor: pointer;
      flex-shrink: 0;
      box-sizing: border-box;
      vertical-align: middle;
      transition:
        color 0.12s ease,
        border-color 0.12s ease,
        background-color 0.12s ease;

      &:hover {
        color: var(--primary-color);
        border-color: color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
        background: color-mix(in srgb, var(--primary-color) 8%, var(--bg-muted-color));
      }
    }

    &__path-current {
      display: inline-flex;
      align-items: center;
      height: 28px;
      max-width: min(360px, 50%);
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      color: var(--text-color);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      flex-shrink: 1;
      min-width: 48px;
      box-sizing: border-box;
    }

    &__storage {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      padding: 6px 10px;
      border-radius: 8px;
      box-sizing: border-box;
      background: var(--bg-muted-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
    }

    &__storage-label {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary-color);
      user-select: none;
      white-space: nowrap;
    }

    &__storage-bar {
      flex-shrink: 1;
      width: 88px;
      min-width: 48px;
      max-width: 88px;

      :deep(.n-progress-graph-line-rail) {
        background-color: color-mix(in srgb, var(--border-color) 50%, transparent);
      }
    }

    &__storage-text {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-muted-color);
      white-space: nowrap;
      user-select: none;
    }

    &__storage-percent {
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--primary-color);
      user-select: none;
    }

    &__section {
      flex-shrink: 0;
      margin-bottom: 22px;

      &--files {
        display: flex;
        flex-direction: column;
        flex: 1 1 0;
        height: 0;
        min-height: 0;
        margin-bottom: 0;
        padding-top: 16px;
        border-top: 1px solid color-mix(in srgb, var(--divider-color) 88%, transparent);
      }
    }

    &__categories {
      display: flex;
      flex-wrap: nowrap;
      align-items: stretch;
      gap: 8px;
      width: 100%;
    }

    &__category {
      --category-accent: var(--primary-color);
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      border-radius: 8px;
      background: linear-gradient(
        135deg,
        var(--bg-secondary-color) 0%,
        color-mix(in srgb, var(--category-accent) 5%, var(--bg-secondary-color)) 100%
      );
      cursor: pointer;
      text-align: left;
      user-select: none;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--category-accent) 28%, var(--border-color));
        box-shadow: 0 2px 8px color-mix(in srgb, var(--category-accent) 10%, transparent);
      }

      &--images {
        --category-accent: var(--primary-color);
      }

      &--videos {
        --category-accent: var(--green);
      }

      &--documents {
        --category-accent: var(--purple);
      }

      &--audio {
        --category-accent: var(--gold);
      }
    }

    &__category-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 8px;
      color: var(--category-accent);
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--category-accent) 16%, var(--bg-secondary-color)),
        color-mix(in srgb, var(--category-accent) 6%, var(--bg-muted-color))
      );
      border: 1px solid color-mix(in srgb, var(--category-accent) 14%, transparent);
      box-shadow: inset 0 1px 0 color-mix(in srgb, var(--bg-secondary-color) 40%, transparent);
    }

    &__category-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      flex: 1;
    }

    &__category-name {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__category-meta {
      font-size: 11px;
      line-height: 1.3;
      color: var(--text-secondary-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__files-head {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      min-width: 0;
      flex-shrink: 0;
      flex-wrap: nowrap;
    }

    &__action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 24px;
      min-height: 24px;
      padding: 0 10px;
      border: none;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      line-height: 12px;
      white-space: nowrap;
      cursor: pointer;
      flex-shrink: 0;
      box-sizing: border-box;
      vertical-align: middle;
      transition:
        color 0.12s ease,
        background-color 0.12s ease;

      &:focus {
        outline: none;
      }

      &:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
        outline-offset: 1px;
      }
    }

    &__action-btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      color: currentColor;

      svg {
        display: block;
        width: 12px;
        height: 12px;
      }
    }

    &__action-btn-label {
      display: block;
      line-height: 12px;
      transform: translateY(0.5px);
    }

    &__action-btn--primary {
      color: #fff;
      background: var(--primary-color);

      &:hover {
        background: color-mix(in srgb, var(--primary-color) 88%, #fff);
      }

      &:active {
        background: var(--primary-color);
      }
    }

    &__action-btn--outline {
      color: var(--text-color);
      background: var(--bg-muted-color);

      &:hover {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, var(--bg-muted-color));
      }

      &:active {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 12%, var(--bg-muted-color));
      }
    }

    &__files-toolbar {
      display: inline-flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 6px;
      padding: 3px 6px;
      border-radius: 8px;
      flex-shrink: 0;
      max-width: 100%;
      box-sizing: border-box;
      background: var(--bg-muted-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);

      .cloud-drive__toolbar-divider:first-of-type {
        margin: 0 2px;
      }
    }

    &__toolbar-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      flex-shrink: 0;
      box-sizing: border-box;
      transition:
        color 0.12s ease,
        background-color 0.12s ease;

      &:hover:not(&--active) {
        color: var(--text-color);
        background: color-mix(in srgb, var(--bg-secondary-color) 70%, var(--bg-muted-color));
      }

      &:focus {
        outline: none;
      }

      &:focus-visible:not(&--active) {
        outline: 2px solid color-mix(in srgb, var(--primary-color) 35%, transparent);
        outline-offset: 1px;
      }

      &--danger:hover:not(&--active) {
        color: var(--red);
        background: color-mix(in srgb, var(--red) 10%, var(--bg-muted-color));
      }

      &--active {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 12%, var(--bg-secondary-color));

        &:hover,
        &:focus,
        &:focus-visible,
        &:active {
          color: var(--primary-color);
          background: color-mix(in srgb, var(--primary-color) 12%, var(--bg-secondary-color));
        }
      }
    }

    &__toolbar-divider {
      width: 1px;
      height: 16px;
      margin: 0 2px;
      background-color: var(--divider-color);
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

    &__table {
      width: 100%;
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

      tbody td {
        line-height: 1.35;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      th.cloud-drive__col-owner,
      td.cloud-drive__col-owner {
        width: 72px;
        text-align: center;
      }

      td.cloud-drive__col-owner {
        :deep(.n-avatar) {
          display: inline-flex;
          vertical-align: middle;
        }
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

      &--folder:hover .cloud-drive__file-name-text--folder {
        text-decoration: underline;
      }
    }

    &__file-name-text--folder {
      color: var(--primary-color);
      font-weight: 500;
    }

    &__file-name {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
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

    &__owner-avatar {
      background: color-mix(in srgb, var(--primary-color) 85%, var(--bg-secondary-color));
      color: #fff;
      font-size: 12px;
      font-weight: 600;
    }
  }

  @media (max-width: 900px) {
    .cloud-drive__action-btn-label {
      display: none;
    }

    .cloud-drive__path-link {
      max-width: 96px;
    }

    .cloud-drive__path-current {
      max-width: min(200px, 42%);
    }

    .cloud-drive__storage {
      gap: 6px;
      padding: 5px 8px;
    }

    .cloud-drive__storage-bar {
      width: 64px;
      min-width: 40px;
      max-width: 64px;
    }

    .cloud-drive__storage-text,
    .cloud-drive__storage-percent,
    .cloud-drive__storage-label {
      font-size: 11px;
    }
  }

  @media (max-width: 760px) {
    .cloud-drive__path-link {
      max-width: 72px;
    }

    .cloud-drive__storage-label {
      display: none;
    }

    .cloud-drive__storage-bar {
      width: 52px;
      min-width: 36px;
      max-width: 52px;
    }
  }
</style>
