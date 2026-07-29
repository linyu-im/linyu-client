<template>
  <section class="cloud-drive-files">
    <CloudDriveHeader
      :title="title"
      :storage-used="storageUsed"
      :storage-total="storageTotal"
      :storage-percent="storagePercent" />
    <CloudDriveCategories ref="categoriesRef" />

    <div class="cloud-drive-files__body">
      <div class="cloud-drive-files__head">
        <nav class="cloud-drive-files__path" :aria-label="t('drive.path.label')">
          <template v-for="(item, index) in displayPathItems" :key="item.itemKey">
            <svg v-if="index > 0" class="cloud-drive-files__path-sep size-12px" aria-hidden="true">
              <use href="#right-arrow"></use>
            </svg>
            <n-dropdown
              v-if="isPathEllipsis(item)"
              trigger="click"
              placement="bottom-start"
              :options="ellipsisPathOptions"
              @select="navigateToSegment">
              <button type="button" class="cloud-drive-files__path-ellipsis" :title="t('drive.path.collapsed')">
                <svg class="size-14px" aria-hidden="true">
                  <use href="#more"></use>
                </svg>
              </button>
            </n-dropdown>
            <button
              v-else-if="!item.current"
              type="button"
              class="cloud-drive-files__path-link"
              :class="{ 'cloud-drive-files__path-link--root': isRootPathItem(item) }"
              :title="item.label"
              @click="navigateToSegment(item.id)">
              <span class="cloud-drive-files__path-text">{{ item.label }}</span>
            </button>
            <span
              v-else
              class="cloud-drive-files__path-current"
              :class="{ 'cloud-drive-files__path-current--root': isRootPathItem(item) }"
              :title="item.label">
              <span class="cloud-drive-files__path-text">{{ item.label }}</span>
            </span>
          </template>
        </nav>
        <div class="cloud-drive-files__toolbar">
          <button type="button" class="cloud-drive-files__action-btn cloud-drive-files__action-btn--primary">
            <svg class="cloud-drive-files__action-btn-icon" aria-hidden="true">
              <use href="#plus"></use>
            </svg>
            <span class="cloud-drive-files__action-btn-label">{{ t('drive.actions.upload') }}</span>
          </button>
          <button
            type="button"
            class="cloud-drive-files__action-btn cloud-drive-files__action-btn--outline"
            @click="startCreateFolder">
            <svg class="cloud-drive-files__action-btn-icon" aria-hidden="true">
              <use href="#folder"></use>
            </svg>
            <span class="cloud-drive-files__action-btn-label">{{ t('drive.actions.newFolder') }}</span>
          </button>
          <template v-if="hasFileSelection">
            <span class="cloud-drive-files__toolbar-divider"></span>
            <button type="button" class="cloud-drive-files__toolbar-btn" :title="t('drive.actions.share')">
              <svg class="size-16px">
                <use href="#share"></use>
              </svg>
            </button>
            <button type="button" class="cloud-drive-files__toolbar-btn" :title="t('drive.actions.download')">
              <svg class="size-16px">
                <use href="#download"></use>
              </svg>
            </button>
            <button
              type="button"
              class="cloud-drive-files__toolbar-btn cloud-drive-files__toolbar-btn--danger"
              :title="t('drive.actions.delete')"
              :disabled="deletingFiles"
              @click="confirmDeleteSelectedFiles">
              <svg class="size-16px">
                <use href="#trash"></use>
              </svg>
            </button>
          </template>
          <span class="cloud-drive-files__toolbar-divider"></span>
          <button
            type="button"
            class="cloud-drive-files__toolbar-btn"
            :class="{ 'cloud-drive-files__toolbar-btn--active': viewMode === 'list' }"
            :title="t('drive.view.list')"
            @click="viewMode = 'list'">
            <svg class="size-16px">
              <use href="#list"></use>
            </svg>
          </button>
          <button
            type="button"
            class="cloud-drive-files__toolbar-btn"
            :class="{ 'cloud-drive-files__toolbar-btn--active': viewMode === 'grid' }"
            :title="t('drive.view.grid')"
            @click="viewMode = 'grid'">
            <svg class="size-16px">
              <use href="#application"></use>
            </svg>
          </button>
        </div>
      </div>

      <div class="cloud-drive-files__table-wrap">
        <n-spin :show="filesLoading" class="cloud-drive-files__spin">
          <div v-if="showFilesEmpty" class="cloud-drive-files__empty">
            <div class="cloud-drive-files__empty-text">
              <i18n-t scope="global" keypath="drive.empty.hintUpload" tag="p">
                <template #upload>
                  <span class="cloud-drive-files__empty-em">{{ t('drive.empty.upload') }}</span>
                </template>
              </i18n-t>
              <i18n-t scope="global" keypath="drive.empty.hintFolder" tag="p">
                <template #newFolder>
                  <span class="cloud-drive-files__empty-em">{{ t('drive.empty.newFolder') }}</span>
                </template>
              </i18n-t>
            </div>
            <div class="cloud-drive-files__empty-actions">
              <button
                type="button"
                class="cloud-drive-files__empty-btn cloud-drive-files__empty-btn--folder"
                @click="startCreateFolder">
                {{ t('drive.actions.newFolder') }}
              </button>
              <button type="button" class="cloud-drive-files__empty-btn cloud-drive-files__empty-btn--upload">
                {{ t('drive.actions.upload') }}
              </button>
            </div>
          </div>
          <table v-else-if="viewMode === 'list'" class="cloud-drive-files__table">
            <thead>
              <tr>
                <th class="cloud-drive-files__col-check">
                  <n-checkbox
                    :checked="allFilesSelected"
                    :indeterminate="someFilesSelected && !allFilesSelected"
                    @update:checked="setAllFilesSelected" />
                </th>
                <th
                  class="cloud-drive-files__col-name cloud-drive-files__th-sortable"
                  :class="{ 'cloud-drive-files__th-sortable--active': sortKey === 'name' }"
                  :title="getSortTitle('name')"
                  @click="toggleSort('name')">
                  <span class="cloud-drive-files__th-label">{{ t('drive.files.columns.name') }}</span>
                  <svg
                    class="cloud-drive-files__sort-icon"
                    :class="{ 'cloud-drive-files__sort-icon--desc': sortKey === 'name' && sortOrder === 'desc' }"
                    aria-hidden="true">
                    <use href="#arrow-up"></use>
                  </svg>
                </th>
                <th
                  class="cloud-drive-files__col-type cloud-drive-files__th-sortable"
                  :class="{ 'cloud-drive-files__th-sortable--active': sortKey === 'type' }"
                  :title="getSortTitle('type')"
                  @click="toggleSort('type')">
                  <span class="cloud-drive-files__th-label">{{ t('drive.files.columns.type') }}</span>
                  <svg
                    class="cloud-drive-files__sort-icon"
                    :class="{ 'cloud-drive-files__sort-icon--desc': sortKey === 'type' && sortOrder === 'desc' }"
                    aria-hidden="true">
                    <use href="#arrow-up"></use>
                  </svg>
                </th>
                <th
                  class="cloud-drive-files__col-modified cloud-drive-files__th-sortable"
                  :class="{ 'cloud-drive-files__th-sortable--active': sortKey === 'modified' }"
                  :title="getSortTitle('modified')"
                  @click="toggleSort('modified')">
                  <span class="cloud-drive-files__th-label">{{ t('drive.files.columns.modified') }}</span>
                  <svg
                    class="cloud-drive-files__sort-icon"
                    :class="{ 'cloud-drive-files__sort-icon--desc': sortKey === 'modified' && sortOrder === 'desc' }"
                    aria-hidden="true">
                    <use href="#arrow-up"></use>
                  </svg>
                </th>
                <th
                  class="cloud-drive-files__col-size cloud-drive-files__th-sortable"
                  :class="{ 'cloud-drive-files__th-sortable--active': sortKey === 'size' }"
                  :title="getSortTitle('size')"
                  @click="toggleSort('size')">
                  <span class="cloud-drive-files__th-label">{{ t('drive.files.columns.size') }}</span>
                  <svg
                    class="cloud-drive-files__sort-icon"
                    :class="{ 'cloud-drive-files__sort-icon--desc': sortKey === 'size' && sortOrder === 'desc' }"
                    aria-hidden="true">
                    <use href="#arrow-up"></use>
                  </svg>
                </th>
                <th class="cloud-drive-files__col-owner">{{ t('drive.files.columns.owner') }}</th>
                <th class="cloud-drive-files__col-actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="creatingFolder" class="cloud-drive-files__row cloud-drive-files__row--creating" @mousedown.stop>
                <td class="cloud-drive-files__col-check" @click.stop>
                  <n-checkbox :checked="false" />
                </td>
                <td class="cloud-drive-files__col-name">
                  <div class="cloud-drive-files__file-name">
                    <span class="cloud-drive-files__file-icon">
                      <img
                        class="cloud-drive-files__file-icon-img"
                        :src="folderIconSrc"
                        :alt="t('drive.files.types.folder')"
                        draggable="false" />
                    </span>
                    <input
                      ref="createFolderInputRef"
                      v-model="creatingFolderName"
                      class="cloud-drive-files__create-input"
                      maxlength="100"
                      @keydown="onCreateFolderKeydown"
                      @blur="onCreateFolderBlur"
                      @click.stop />
                  </div>
                </td>
                <td class="cloud-drive-files__col-type">{{ t('drive.files.types.folder') }}</td>
                <td class="cloud-drive-files__col-modified">{{ creatingFolderTime }}</td>
                <td class="cloud-drive-files__col-size">-</td>
                <td class="cloud-drive-files__col-owner">
                  <Avatar
                    v-if="currentUserId"
                    round
                    :size="24"
                    class="cloud-drive-files__owner-avatar"
                    :id="currentUserId" />
                </td>
                <td class="cloud-drive-files__col-actions"></td>
              </tr>
              <tr
                v-for="file in displayedFiles"
                :key="file.id"
                class="cloud-drive-files__row"
                :class="{
                  'cloud-drive-files__row--selected': selectedFileIds.has(file.id),
                  'cloud-drive-files__row--folder': file.isDir
                }"
                @click="onRowClick(file)"
                @dblclick="onRowDblClick(file)">
                <td class="cloud-drive-files__col-check" @click.stop>
                  <n-checkbox
                    :checked="selectedFileIds.has(file.id)"
                    @update:checked="(checked) => setFileSelected(file.id, checked)" />
                </td>
                <td class="cloud-drive-files__col-name">
                  <div class="cloud-drive-files__file-name">
                    <span class="cloud-drive-files__file-icon">
                      <img
                        class="cloud-drive-files__file-icon-img"
                        :src="fileIconSrc(file)"
                        :alt="file.fileName"
                        draggable="false" />
                    </span>
                    <span
                      class="cloud-drive-files__file-name-text"
                      :class="{ 'cloud-drive-files__file-name-text--folder': file.isDir }"
                      :title="file.fileName">
                      {{ file.fileName }}
                    </span>
                  </div>
                </td>
                <td class="cloud-drive-files__col-type">{{ getFileTypeLabel(file) }}</td>
                <td class="cloud-drive-files__col-modified">{{ file.updatedAt }}</td>
                <td class="cloud-drive-files__col-size">{{ getFileSizeLabel(file) }}</td>
                <td class="cloud-drive-files__col-owner">
                  <Avatar round :size="24" class="cloud-drive-files__owner-avatar" :id="file.userId" />
                </td>
                <td class="cloud-drive-files__col-actions" @click.stop>
                  <n-dropdown trigger="click" placement="bottom-end" :options="rowMoreOptions">
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
          <div v-else class="cloud-drive-files__grid">
            <div
              v-if="creatingFolder"
              class="cloud-drive-files__grid-item cloud-drive-files__grid-item--creating"
              @mousedown.stop>
              <span class="cloud-drive-files__grid-icon">
                <img
                  class="cloud-drive-files__grid-icon-img"
                  :src="folderIconSrc"
                  :alt="t('drive.files.types.folder')"
                  draggable="false" />
              </span>
              <input
                ref="createFolderInputRef"
                v-model="creatingFolderName"
                class="cloud-drive-files__grid-create-input"
                maxlength="100"
                @keydown="onCreateFolderKeydown"
                @blur="onCreateFolderBlur"
                @click.stop />
            </div>
            <div
              v-for="file in displayedFiles"
              :key="file.id"
              class="cloud-drive-files__grid-item"
              :class="{
                'cloud-drive-files__grid-item--selected': selectedFileIds.has(file.id),
                'cloud-drive-files__grid-item--folder': file.isDir
              }"
              :title="file.fileName"
              @click="onRowClick(file)"
              @dblclick="onRowDblClick(file)">
              <span
                class="cloud-drive-files__grid-check"
                :class="{ 'cloud-drive-files__grid-check--visible': selectedFileIds.has(file.id) }"
                @click.stop>
                <n-checkbox
                  :checked="selectedFileIds.has(file.id)"
                  @update:checked="(checked) => setFileSelected(file.id, checked)" />
              </span>
              <span class="cloud-drive-files__grid-more" @click.stop>
                <n-dropdown trigger="click" placement="bottom-end" :options="rowMoreOptions">
                  <n-button quaternary size="tiny">
                    <svg class="size-16px">
                      <use href="#more"></use>
                    </svg>
                  </n-button>
                </n-dropdown>
              </span>
              <span class="cloud-drive-files__grid-icon">
                <img
                  class="cloud-drive-files__grid-icon-img"
                  :src="fileIconSrc(file)"
                  :alt="file.fileName"
                  draggable="false" />
              </span>
              <span class="cloud-drive-files__grid-name">{{ file.fileName }}</span>
            </div>
          </div>
        </n-spin>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { spaceApi } from '@/api'
  import CloudDriveCategories from '@/components/CloudDrive/CloudDriveCategories.vue'
  import CloudDriveHeader from '@/components/CloudDrive/CloudDriveHeader.vue'
  import { SpaceRootParentId } from '@/constants/space'
  import { useUserStore } from '@/stores/user/user'
  import { getDriveListFileIconUrl, getFolderIconUrl } from '@/utils/file/fileIcon'
  import type { SpaceFile } from '@/types/api/space'
  import type { DropdownOption } from 'naive-ui'
  import { useI18n } from 'vue-i18n'

  type ViewMode = 'list' | 'grid'
  type SortKey = 'name' | 'type' | 'modified' | 'size'
  type SortOrder = 'asc' | 'desc'

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

  interface Props {
    searchKeyword?: string
    title: string
    storageUsed: string
    storageTotal: string
    storagePercent: number
  }

  const props = withDefaults(defineProps<Props>(), {
    searchKeyword: ''
  })

  const PATH_MAX_VISIBLE = 3
  const PATH_HEAD_COUNT = 1
  const PATH_TAIL_COUNT = 2
  const PATH_EXCLUDED_IDS = new Set(['drive'])
  const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'heic', 'heif'])
  const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'])

  const { t } = useI18n()
  const dialog = useDialog()
  const userStore = useUserStore()

  const emit = defineEmits<{
    deleted: []
  }>()

  const viewMode = ref<ViewMode>('list')
  const sortKey = ref<SortKey | null>(null)
  const sortOrder = ref<SortOrder>('asc')
  const selectedFileIds = ref(new Set<string>())
  const currentFolderId = ref<string>(SpaceRootParentId)
  const folderStack = ref<PathSegment[]>([])
  const fileList = ref<SpaceFile[]>([])
  const filesLoading = ref(false)
  const deletingFiles = ref(false)
  const creatingFolder = ref(false)
  const creatingFolderName = ref('')
  const creatingFolderTime = ref('')
  const creatingFolderSubmitting = ref(false)
  const createFolderInputRef = ref<HTMLInputElement | null>(null)
  const categoriesRef = ref<InstanceType<typeof CloudDriveCategories> | null>(null)
  let skipCreateFolderBlur = false

  const currentUserId = computed(() => userStore.authInfo.userId)
  const folderIconSrc = getFolderIconUrl()

  const padTime = (value: number, length = 2) => String(value).padStart(length, '0')

  const formatDateTimeMinute = (date: Date) =>
    `${date.getFullYear()}-${padTime(date.getMonth() + 1)}-${padTime(date.getDate())} ${padTime(date.getHours())}:${padTime(date.getMinutes())}`

  const buildDefaultFolderName = () => {
    const now = new Date()
    const stamp = `${padTime(now.getFullYear() % 100)}${padTime(now.getMonth() + 1)}${padTime(now.getDate())}-${padTime(now.getHours())}${padTime(now.getMinutes())}${padTime(now.getSeconds())}${padTime(now.getMilliseconds(), 3)}`
    return `${t('drive.actions.newFolder')}-${stamp}`
  }

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    return `${(bytes / 1024 / 1024 / 1024 / 1024).toFixed(1)} TB`
  }

  const fetchFileList = (parentId = currentFolderId.value) => {
    filesLoading.value = true
    spaceApi
      .listSpaceUserFile({ parentId })
      .then((res) => {
        if (res.code === 0 && res.data) {
          fileList.value = res.data
        } else {
          window.$message.error(res.msg)
        }
      })
      .finally(() => {
        filesLoading.value = false
      })
  }

  const refresh = () => {
    fetchFileList(currentFolderId.value)
  }

  const resetToRoot = () => {
    if (creatingFolder.value) cancelCreateFolder()
    folderStack.value = []
    currentFolderId.value = SpaceRootParentId
    selectedFileIds.value = new Set()
    fetchFileList(SpaceRootParentId)
  }

  const normalizePathSegments = (segments: PathSegment[]) =>
    segments.filter((segment) => !PATH_EXCLUDED_IDS.has(segment.id))

  const pathSegments = computed<PathSegment[]>(() => {
    if (currentFolderId.value === SpaceRootParentId) {
      return [{ id: SpaceRootParentId, label: t('drive.path.allFiles'), current: true }]
    }

    return normalizePathSegments([
      { id: SpaceRootParentId, label: t('drive.path.allFiles') },
      ...folderStack.value.map((segment, index) => ({
        ...segment,
        current: index === folderStack.value.length - 1
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

  const isRootPathItem = (item: DisplayPathItem) => !isPathEllipsis(item) && item.id === SpaceRootParentId

  const filteredFiles = computed(() => {
    const keyword = props.searchKeyword.trim().toLowerCase()
    if (!keyword) return fileList.value
    return fileList.value.filter((file) => file.fileName.toLowerCase().includes(keyword))
  })

  const parseFileTime = (value: string) => new Date(value.replace(/-/g, '/')).getTime()

  const compareFiles = (a: SpaceFile, b: SpaceFile, key: SortKey) => {
    switch (key) {
      case 'name':
        return a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base', numeric: true })
      case 'type':
        return getFileTypeLabel(a).localeCompare(getFileTypeLabel(b), undefined, { sensitivity: 'base' })
      case 'modified':
        return parseFileTime(a.updatedAt) - parseFileTime(b.updatedAt)
      case 'size':
        return (a.isDir ? -1 : a.filSize) - (b.isDir ? -1 : b.filSize)
      default:
        return 0
    }
  }

  const displayedFiles = computed(() => {
    const list = [...filteredFiles.value]
    list.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      if (!sortKey.value) return a.fileName.localeCompare(b.fileName, undefined, { sensitivity: 'base', numeric: true })
      const result = compareFiles(a, b, sortKey.value)
      return sortOrder.value === 'asc' ? result : -result
    })
    return list
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey.value !== key) {
      sortKey.value = key
      sortOrder.value = 'asc'
      return
    }
    if (sortOrder.value === 'asc') {
      sortOrder.value = 'desc'
      return
    }
    sortKey.value = null
    sortOrder.value = 'asc'
  }

  const getSortTitle = (key: SortKey) => {
    if (sortKey.value !== key) return t('drive.files.sortAsc')
    if (sortOrder.value === 'asc') return t('drive.files.sortDesc')
    return t('drive.files.sortClear')
  }

  const showFilesEmpty = computed(() => !filesLoading.value && fileList.value.length === 0 && !creatingFolder.value)

  const allFilesSelected = computed(() => {
    const list = displayedFiles.value
    return list.length > 0 && list.every((file) => selectedFileIds.value.has(file.id))
  })

  const someFilesSelected = computed(() => displayedFiles.value.some((file) => selectedFileIds.value.has(file.id)))

  const hasFileSelection = computed(() => selectedFileIds.value.size > 0)

  const rowMoreOptions = computed<DropdownOption[]>(() => [
    { label: () => t('drive.files.menu.moveTo'), key: 'moveTo' },
    { label: () => t('drive.files.menu.rename'), key: 'rename' },
    { label: () => t('drive.files.menu.detail'), key: 'detail' },
    { type: 'divider', key: 'd1' },
    { label: () => t('drive.files.menu.share'), key: 'share' },
    { label: () => t('drive.files.menu.download'), key: 'download' },
    { type: 'divider', key: 'd2' },
    {
      label: () => t('drive.files.menu.delete'),
      key: 'delete',
      props: { class: 'cloud-drive-files__menu-item--danger' }
    }
  ])

  const fileIconSrc = (file: SpaceFile) => getDriveListFileIconUrl(file.fileName, file.isDir)

  const getFileTypeLabel = (file: SpaceFile) => {
    if (file.isDir) return t('drive.files.types.folder')
    const ext = (file.fileType || '').trim().toLowerCase()
    if (!ext) return t('drive.files.types.file')
    if (IMAGE_EXTS.has(ext)) return t('drive.files.types.image')
    if (ext === 'pdf') return t('drive.files.types.pdf')
    if (ARCHIVE_EXTS.has(ext)) return t('drive.files.types.archive')
    return ext.toUpperCase()
  }

  const getFileSizeLabel = (file: SpaceFile) => {
    if (file.isDir) return '-'
    return formatBytes(file.filSize)
  }

  const focusCreateFolderInput = () => {
    nextTick(() => {
      const input = createFolderInputRef.value
      if (!input) return
      input.focus()
      input.select()
    })
  }

  const cancelCreateFolder = () => {
    skipCreateFolderBlur = true
    creatingFolder.value = false
    creatingFolderName.value = ''
    creatingFolderTime.value = ''
    creatingFolderSubmitting.value = false
  }

  const startCreateFolder = () => {
    if (creatingFolder.value || creatingFolderSubmitting.value) {
      focusCreateFolderInput()
      return
    }
    const now = new Date()
    creatingFolderName.value = buildDefaultFolderName()
    creatingFolderTime.value = formatDateTimeMinute(now)
    creatingFolder.value = true
    skipCreateFolderBlur = false
    focusCreateFolderInput()
  }

  const commitCreateFolder = () => {
    if (!creatingFolder.value || creatingFolderSubmitting.value) return

    const dirName = creatingFolderName.value.trim()
    if (!dirName) {
      cancelCreateFolder()
      return
    }

    creatingFolderSubmitting.value = true
    spaceApi
      .createSpaceUserDir({
        parentId: currentFolderId.value,
        dirName
      })
      .then((res) => {
        if (res.code === 0) {
          cancelCreateFolder()
          fetchFileList(currentFolderId.value)
          return
        }
        window.$message.error(res.msg)
        creatingFolderSubmitting.value = false
        focusCreateFolderInput()
      })
      .catch(() => {
        creatingFolderSubmitting.value = false
        focusCreateFolderInput()
      })
  }

  const onCreateFolderKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      skipCreateFolderBlur = true
      commitCreateFolder()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelCreateFolder()
    }
  }

  const onCreateFolderBlur = () => {
    if (skipCreateFolderBlur) {
      skipCreateFolderBlur = false
      return
    }
    commitCreateFolder()
  }

  const enterFolder = (file: SpaceFile) => {
    if (!file.isDir) return
    if (creatingFolder.value) cancelCreateFolder()
    folderStack.value = [...folderStack.value, { id: file.id, label: file.fileName }]
    currentFolderId.value = file.id
    selectedFileIds.value = new Set()
    fetchFileList(file.id)
  }

  const navigateToSegment = (segmentId: string) => {
    if (creatingFolder.value) cancelCreateFolder()
    if (segmentId === SpaceRootParentId) {
      folderStack.value = []
      currentFolderId.value = SpaceRootParentId
    } else {
      const index = folderStack.value.findIndex((segment) => segment.id === segmentId)
      if (index === -1) return
      folderStack.value = folderStack.value.slice(0, index + 1)
      currentFolderId.value = segmentId
    }
    selectedFileIds.value = new Set()
    fetchFileList(currentFolderId.value)
  }

  const onRowClick = (file: SpaceFile) => {
    if (file.isDir) {
      enterFolder(file)
      return
    }
    toggleFileSelect(file.id)
  }

  const onRowDblClick = (file: SpaceFile) => {
    if (file.isDir) enterFolder(file)
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
    for (const file of displayedFiles.value) {
      if (checked) next.add(file.id)
      else next.delete(file.id)
    }
    selectedFileIds.value = next
  }

  const confirmDeleteSelectedFiles = () => {
    const spaceFileIDs = [...selectedFileIds.value]
    if (spaceFileIDs.length === 0 || deletingFiles.value) return

    dialog.warning({
      title: t('drive.delete.confirmTitle'),
      content: t('drive.delete.confirmContent', { count: spaceFileIDs.length }),
      positiveText: t('drive.delete.confirm'),
      negativeText: t('drive.delete.cancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        deletingFiles.value = true
        return spaceApi
          .deleteSpaceUserFile({ spaceFileIDs })
          .then((res) => {
            if (res.code === 0) {
              selectedFileIds.value = new Set()
              fetchFileList(currentFolderId.value)
              categoriesRef.value?.refresh()
              emit('deleted')
              window.$message.success(t('drive.delete.success'))
            } else {
              window.$message.error(res.msg)
            }
          })
          .finally(() => {
            deletingFiles.value = false
          })
      }
    })
  }

  defineExpose({
    resetToRoot,
    refresh
  })

  onMounted(() => {
    fetchFileList(SpaceRootParentId)
  })

  onActivated(() => {
    fetchFileList(currentFolderId.value)
  })
</script>

<style scoped lang="scss">
  .cloud-drive-files {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    height: 0;
    min-height: 0;
    margin-bottom: 0;

    &__body {
      display: flex;
      flex-direction: column;
      flex: 1 1 0;
      height: 0;
      min-height: 0;
      margin-bottom: 0;
      padding-top: 16px;
      border-top: 1px solid color-mix(in srgb, var(--divider-color) 88%, transparent);
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
      max-width: 140px;
      min-width: 0;
      height: 28px;
      padding: 0;
      border: none;
      background: none;
      font-size: 15px;
      font-weight: 500;
      line-height: 1;
      color: var(--text-secondary-color);
      cursor: pointer;
      flex-shrink: 1;
      box-sizing: border-box;
      transition: color 0.12s ease;

      .cloud-drive-files__path-text {
        max-width: 140px;
      }

      &:hover {
        color: var(--primary-color);
      }

      &--root {
        flex-shrink: 0;
        max-width: none;

        .cloud-drive-files__path-text {
          max-width: none;
          overflow: visible;
          text-overflow: clip;
        }
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
      max-width: min(360px, 50%);
      min-width: 48px;
      height: 28px;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      color: var(--text-color);
      flex-shrink: 1;
      box-sizing: border-box;

      .cloud-drive-files__path-text {
        max-width: 100%;
      }

      &--root {
        flex-shrink: 0;
        max-width: none;
        min-width: auto;

        .cloud-drive-files__path-text {
          max-width: none;
          overflow: visible;
          text-overflow: clip;
        }
      }
    }

    &__path-text {
      display: block;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &__head {
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

    &__toolbar {
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

      .cloud-drive-files__toolbar-divider:first-of-type {
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
      gap: 18px;
      height: 100%;
      min-height: 280px;
      padding: 40px 20px;
      box-sizing: border-box;
      user-select: none;
    }

    &__empty-text {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-secondary-color);

      p {
        margin: 0;
      }
    }

    &__empty-em {
      color: var(--primary-color);
      font-weight: 500;
    }

    &__empty-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
    }

    &__empty-btn {
      min-width: 108px;
      height: 34px;
      padding: 0 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease;

      &--folder {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 12%, var(--bg-primary-color));

        &:hover {
          background: color-mix(in srgb, var(--primary-color) 18%, var(--bg-primary-color));
        }
      }

      &--upload {
        color: #fff;
        background: var(--primary-color);

        &:hover {
          background: color-mix(in srgb, var(--primary-color) 88%, #fff);
        }
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

      tbody td {
        line-height: 1.35;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      th.cloud-drive-files__col-owner,
      td.cloud-drive-files__col-owner {
        width: 72px;
        text-align: center;
      }

      td.cloud-drive-files__col-owner {
        :deep(.n-avatar) {
          display: inline-flex;
          vertical-align: middle;
        }
      }
    }

    &__th-sortable {
      cursor: pointer;

      .cloud-drive-files__th-label,
      .cloud-drive-files__sort-icon {
        display: inline-block;
        vertical-align: middle;
      }

      .cloud-drive-files__sort-icon {
        width: 12px;
        height: 12px;
        margin-left: 4px;
        flex-shrink: 0;
        opacity: 0;
        color: var(--text-secondary-color);
        transition:
          opacity 0.12s ease,
          transform 0.12s ease,
          color 0.12s ease;
      }

      &:hover .cloud-drive-files__sort-icon {
        opacity: 0.7;
      }

      &--active {
        color: var(--primary-color);

        .cloud-drive-files__sort-icon {
          opacity: 1;
          color: var(--primary-color);
        }
      }
    }

    &__sort-icon--desc {
      transform: rotate(180deg);
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
      width: 88px;
    }

    &__col-modified {
      width: 168px;
      white-space: nowrap;
    }

    &__col-size {
      width: 88px;
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

      &--folder:hover .cloud-drive-files__file-name-text--folder {
        text-decoration: underline;
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

      &--folder {
        color: var(--primary-color);
        font-weight: 500;
      }
    }

    &__create-input {
      flex: 1;
      min-width: 160px;
      max-width: 360px;
      height: 28px;
      padding: 0 8px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      outline: none;
      box-sizing: border-box;
      font-size: 13px;
      line-height: 28px;
      color: var(--text-color);
      background: var(--bg-primary-color);

      &:focus {
        border-color: var(--primary-color);
      }
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

    &__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
      gap: 8px 12px;
      align-content: start;
      padding: 16px 12px;
      box-sizing: border-box;
      min-height: 100%;
    }

    &__grid-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 100%;
      max-width: 112px;
      margin: 0 auto;
      padding: 12px 8px 10px;
      border-radius: 10px;
      box-sizing: border-box;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.12s ease;

      &:hover {
        background-color: color-mix(in srgb, var(--primary-color) 10%, var(--bg-secondary-color));

        .cloud-drive-files__grid-check {
          opacity: 1;
        }

        .cloud-drive-files__grid-more {
          opacity: 1;
        }
      }

      &--selected {
        background-color: color-mix(in srgb, var(--primary-color) 12%, var(--bg-secondary-color));

        .cloud-drive-files__grid-check {
          opacity: 1;
        }

        .cloud-drive-files__grid-more {
          opacity: 1;
        }
      }

      &--creating {
        cursor: default;

        &:hover {
          background-color: transparent;
        }
      }
    }

    &__grid-check {
      position: absolute;
      top: 6px;
      left: 6px;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.12s ease;

      &--visible {
        opacity: 1;
      }

      :deep(.n-checkbox) {
        display: inline-flex;
      }
    }

    &__grid-more {
      position: absolute;
      top: 4px;
      right: 4px;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.12s ease;

      :deep(.n-button) {
        width: 24px;
        height: 24px;
        padding: 0;
      }
    }

    &__grid-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
    }

    &__grid-icon-img {
      display: block;
      width: 48px;
      height: 48px;
      object-fit: contain;
      object-position: center;
      user-select: none;
      pointer-events: none;
    }

    &__grid-name {
      display: -webkit-box;
      width: 100%;
      max-height: 36px;
      overflow: hidden;
      text-align: center;
      font-size: 12px;
      line-height: 18px;
      color: var(--text-color);
      word-break: break-all;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    &__grid-create-input {
      width: 100%;
      height: 28px;
      padding: 0 6px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      outline: none;
      box-sizing: border-box;
      text-align: center;
      font-size: 12px;
      line-height: 28px;
      color: var(--text-color);
      background: var(--bg-primary-color);

      &:focus {
        border-color: var(--primary-color);
      }
    }
  }

  @media (max-width: 900px) {
    .cloud-drive-files__action-btn-label {
      display: none;
    }

    .cloud-drive-files__path-link:not(.cloud-drive-files__path-link--root) {
      max-width: 96px;
    }

    .cloud-drive-files__path-current:not(.cloud-drive-files__path-current--root) {
      max-width: min(200px, 42%);
    }
  }

  @media (max-width: 760px) {
    .cloud-drive-files__path-link:not(.cloud-drive-files__path-link--root) {
      max-width: 72px;
    }
  }

  :global(.n-dropdown-menu .cloud-drive-files__menu-item--danger) {
    color: var(--red);
  }

  :global(.n-dropdown-menu .cloud-drive-files__menu-item--danger:hover) {
    color: var(--red) !important;
  }
</style>
