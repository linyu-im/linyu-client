<template>
  <n-modal v-model:show="visible" :mask-closable="true" :auto-focus="false" transform-origin="center">
    <div class="cloud-drive-move-modal">
      <div class="cloud-drive-move-modal__header">
        <h2 class="cloud-drive-move-modal__title">{{ modalTitle }}</h2>
        <button
          type="button"
          class="cloud-drive-move-modal__close"
          :aria-label="t('drive.move.cancel')"
          @click="onCancel">
          <svg class="size-14px" aria-hidden="true">
            <use href="#close"></use>
          </svg>
        </button>
      </div>

      <div class="cloud-drive-move-modal__sub">
        <nav class="cloud-drive-move-modal__breadcrumb" :aria-label="t('drive.path.label')">
          <template v-for="(item, index) in displayBreadcrumbItems" :key="item.itemKey">
            <svg v-if="index > 0" class="cloud-drive-move-modal__breadcrumb-sep size-12px" aria-hidden="true">
              <use href="#right-arrow"></use>
            </svg>
            <n-dropdown
              v-if="isBreadcrumbEllipsis(item)"
              trigger="click"
              placement="bottom-start"
              :options="ellipsisBreadcrumbOptions"
              @select="selectNode">
              <button
                type="button"
                class="cloud-drive-move-modal__breadcrumb-ellipsis"
                :title="t('drive.path.collapsed')">
                <svg class="size-14px" aria-hidden="true">
                  <use href="#more"></use>
                </svg>
              </button>
            </n-dropdown>
            <button
              v-else-if="!item.current"
              type="button"
              class="cloud-drive-move-modal__breadcrumb-item"
              :title="item.label"
              @click="selectNode(item.id)">
              <span class="cloud-drive-move-modal__breadcrumb-text">{{ item.label }}</span>
            </button>
            <span v-else class="cloud-drive-move-modal__breadcrumb-current" :title="item.label">
              <span class="cloud-drive-move-modal__breadcrumb-text">{{ item.label }}</span>
            </span>
          </template>
        </nav>
      </div>

      <div class="cloud-drive-move-modal__body">
        <n-spin :show="treeLoading" class="cloud-drive-move-modal__spin">
          <div v-if="!treeLoading && displayRoots.length === 0" class="cloud-drive-move-modal__empty">
            {{ t('drive.move.empty') }}
          </div>
          <n-scrollbar v-else class="cloud-drive-move-modal__scroll">
            <div class="cloud-drive-move-modal__tree">
              <MoveTreeNode
                v-for="node in displayRoots"
                :key="node.id"
                :node="node"
                :depth="0"
                :selected-id="selectedId"
                :expanded-ids="expandedIds"
                :disabled-ids="disabledIds"
                :folder-icon="folderIcon"
                :creating-parent-id="creatingParentId"
                :creating-name="creatingFolderName"
                @toggle="toggleExpand"
                @select="selectNode"
                @update:creating-name="onCreatingNameUpdate"
                @commit-create="commitCreateFolder"
                @cancel-create="cancelCreateFolder" />
            </div>
          </n-scrollbar>
        </n-spin>
      </div>

      <div class="cloud-drive-move-modal__footer">
        <n-button
          class="cloud-drive-move-modal__btn cloud-drive-move-modal__btn--soft"
          :disabled="creating || creatingParentId !== ''"
          @click="onCreateFolder">
          {{ t('drive.move.newFolder') }}
        </n-button>
        <div class="cloud-drive-move-modal__footer-right">
          <n-button
            class="cloud-drive-move-modal__btn cloud-drive-move-modal__btn--soft"
            :disabled="moving"
            @click="onCancel">
            {{ t('drive.move.cancel') }}
          </n-button>
          <n-button
            type="primary"
            class="cloud-drive-move-modal__btn"
            :loading="moving"
            :disabled="!canConfirm"
            @click="onConfirm">
            {{ confirmLabel }}
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="tsx">
  import { spaceApi } from '@/api'
  import { SpaceRootParentId } from '@/constants/space'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import type { SpaceUserDirTreeNode } from '@/types/api/space'
  import { getFolderIconUrl } from '@/utils/file/fileIcon'
  import type { DropdownOption } from 'naive-ui'
  import { useI18n } from 'vue-i18n'

  interface TreeViewNode {
    id: string
    fileName: string
    parentId: string
    path: string
    level: number
    children: TreeViewNode[]
  }

  interface BreadcrumbSegment {
    id: string
    label: string
    current?: boolean
  }

  type BreadcrumbSegmentDisplay = BreadcrumbSegment & { itemKey: string }

  type BreadcrumbEllipsisDisplay = {
    itemKey: 'ellipsis'
    type: 'ellipsis'
    hidden: BreadcrumbSegment[]
  }

  type DisplayBreadcrumbItem = BreadcrumbSegmentDisplay | BreadcrumbEllipsisDisplay

  const PATH_MAX_VISIBLE = 3
  const PATH_HEAD_COUNT = 1
  const PATH_TAIL_COUNT = 2

  const visible = defineModel<boolean>('show', { default: false })

  const props = withDefaults(
    defineProps<{
      /** move：移动文件；select：仅选择目录并回传 */
      mode?: 'move' | 'select'
      spaceFileIds?: string[]
      /** 打开时预选中的目录 id */
      initialSelectedId?: string
    }>(),
    {
      mode: 'move',
      spaceFileIds: () => [],
      initialSelectedId: SpaceRootParentId
    }
  )

  const emit = defineEmits<{
    success: [targetParentId: string, targetName: string]
    cancel: []
  }>()

  const { t } = useI18n()
  const folderIcon = getFolderIconUrl()
  const isSelectMode = computed(() => props.mode === 'select')
  const modalTitle = computed(() => (isSelectMode.value ? t('drive.move.selectTitle') : t('drive.move.title')))
  const confirmLabel = computed(() => (isSelectMode.value ? t('drive.move.selectConfirm') : t('drive.move.confirm')))

  const treeLoading = ref(false)
  const moving = ref(false)
  const creating = ref(false)
  const treeRoots = ref<TreeViewNode[]>([])
  const selectedId = ref<string>(SpaceRootParentId)
  const expandedIds = ref<Set<string>>(new Set([SpaceRootParentId]))
  const creatingParentId = ref('')
  const creatingFolderName = ref('')
  let skipCreateBlur = false

  useEscapeOverlay(() => {
    if (creatingParentId.value) {
      cancelCreateFolder()
      return
    }
    visible.value = false
  }, visible)

  const rootNode = computed<TreeViewNode>(() => ({
    id: SpaceRootParentId,
    fileName: t('drive.path.allFiles'),
    parentId: '',
    path: '/',
    level: 0,
    children: treeRoots.value
  }))

  const displayRoots = computed(() => [rootNode.value])

  const nodeMap = computed(() => {
    const map = new Map<string, TreeViewNode>()
    const walk = (nodes: TreeViewNode[]) => {
      for (const node of nodes) {
        map.set(node.id, node)
        if (node.children?.length) walk(node.children)
      }
    }
    walk(displayRoots.value)
    return map
  })

  const disabledIds = computed(() => {
    const movingIds = new Set(props.spaceFileIds.filter(Boolean))
    const blocked = new Set<string>()
    const walk = (nodes: TreeViewNode[], ancestorBlocked: boolean) => {
      for (const node of nodes) {
        const selfBlocked = ancestorBlocked || movingIds.has(node.id)
        if (selfBlocked) blocked.add(node.id)
        if (node.children?.length) walk(node.children, selfBlocked)
      }
    }
    walk(treeRoots.value, false)
    return blocked
  })

  const breadcrumb = computed<BreadcrumbSegment[]>(() => {
    const segments: BreadcrumbSegment[] = []
    let current = nodeMap.value.get(selectedId.value)
    while (current) {
      segments.unshift({ id: current.id, label: current.fileName })
      if (!current.parentId || current.id === SpaceRootParentId) break
      current = nodeMap.value.get(current.parentId)
    }
    if (segments.length === 0 || segments[0]?.id !== SpaceRootParentId) {
      segments.unshift({ id: SpaceRootParentId, label: t('drive.path.allFiles') })
    }
    return segments.map((segment, index) => ({
      ...segment,
      current: index === segments.length - 1
    }))
  })

  const displayBreadcrumbItems = computed<DisplayBreadcrumbItem[]>(() => {
    const mapped: BreadcrumbSegmentDisplay[] = breadcrumb.value.map((segment) => ({
      ...segment,
      itemKey: segment.id
    }))
    if (mapped.length <= PATH_MAX_VISIBLE) return mapped

    const head = mapped.slice(0, PATH_HEAD_COUNT)
    const tail = mapped.slice(-PATH_TAIL_COUNT)
    const hidden = mapped.slice(PATH_HEAD_COUNT, -PATH_TAIL_COUNT)
    const ellipsis: BreadcrumbEllipsisDisplay = { itemKey: 'ellipsis', type: 'ellipsis', hidden }
    return [...head, ellipsis, ...tail]
  })

  const ellipsisBreadcrumbOptions = computed<DropdownOption[]>(() => {
    const ellipsis = displayBreadcrumbItems.value.find((item) => isBreadcrumbEllipsis(item))
    if (!ellipsis) return []
    return ellipsis.hidden.map((segment) => ({
      label: segment.label,
      key: segment.id
    }))
  })

  const isBreadcrumbEllipsis = (item: DisplayBreadcrumbItem): item is BreadcrumbEllipsisDisplay =>
    item.itemKey === 'ellipsis'

  const canConfirm = computed(() => {
    if (!selectedId.value || disabledIds.value.has(selectedId.value) || moving.value || creatingParentId.value) {
      return false
    }
    if (isSelectMode.value) return true
    return props.spaceFileIds.length > 0
  })

  const mapApiNodes = (nodes: SpaceUserDirTreeNode[]): TreeViewNode[] =>
    (nodes || []).map((node) => ({
      id: node.id,
      fileName: node.fileName,
      parentId: node.parentId || SpaceRootParentId,
      path: node.path || '',
      level: node.level || 0,
      children: mapApiNodes(node.children || [])
    }))

  const fetchTree = (preferSelectId?: string) => {
    treeLoading.value = true
    return spaceApi
      .getSpaceUserDirTree()
      .then((res) => {
        if (res.code === 0 && res.data) {
          treeRoots.value = mapApiNodes(res.data)
          const nextSelect = preferSelectId || selectedId.value || SpaceRootParentId
          if (nodeMap.value.has(nextSelect) || nextSelect === SpaceRootParentId) {
            selectedId.value = nextSelect
          } else {
            selectedId.value = SpaceRootParentId
          }
          ensureExpandedTo(selectedId.value)
          return
        }
        window.$message.error(res.msg)
        treeRoots.value = []
      })
      .catch(() => {
        treeRoots.value = []
      })
      .finally(() => {
        treeLoading.value = false
      })
  }

  const ensureExpandedTo = (id: string) => {
    const next = new Set(expandedIds.value)
    next.add(SpaceRootParentId)
    let current = nodeMap.value.get(id)
    while (current) {
      next.add(current.id)
      if (!current.parentId || current.id === SpaceRootParentId) break
      current = nodeMap.value.get(current.parentId)
    }
    expandedIds.value = next
  }

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    expandedIds.value = next
  }

  const selectNode = (id: string | number) => {
    const targetId = String(id)
    if (disabledIds.value.has(targetId)) return
    if (creatingParentId.value) cancelCreateFolder()
    selectedId.value = targetId
    ensureExpandedTo(targetId)
  }

  const onCancel = () => {
    cancelCreateFolder()
    visible.value = false
    emit('cancel')
  }

  const resolveSelectedName = () =>
    nodeMap.value.get(selectedId.value)?.fileName ||
    (selectedId.value === SpaceRootParentId ? t('drive.path.allFiles') : selectedId.value)

  const onConfirm = () => {
    if (!canConfirm.value) return
    const targetName = resolveSelectedName()

    if (isSelectMode.value) {
      visible.value = false
      emit('success', selectedId.value, targetName)
      return
    }

    const spaceFileIds = props.spaceFileIds.filter(Boolean)
    if (spaceFileIds.length === 0) return

    moving.value = true
    spaceApi
      .moveSpaceUserFile({
        spaceFileIds,
        targetParentId: selectedId.value
      })
      .then((res) => {
        if (res.code === 0) {
          window.$message.success(t('drive.move.success'))
          visible.value = false
          emit('success', selectedId.value, targetName)
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        moving.value = false
      })
  }

  const buildDefaultFolderName = () => {
    const now = new Date()
    const pad = (value: number, length = 2) => String(value).padStart(length, '0')
    const stamp = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`
    return `${t('drive.actions.newFolder')}-${stamp}`
  }

  const onCreatingNameUpdate = (value: string) => {
    creatingFolderName.value = value
  }

  const cancelCreateFolder = () => {
    skipCreateBlur = true
    creatingParentId.value = ''
    creatingFolderName.value = ''
    creating.value = false
  }

  const commitCreateFolder = () => {
    if (!creatingParentId.value || creating.value) return
    const parentId = creatingParentId.value
    const dirName = creatingFolderName.value.trim()
    if (!dirName) {
      cancelCreateFolder()
      return
    }

    creating.value = true
    spaceApi
      .createSpaceUserDir({ parentId, dirName })
      .then((res) => {
        if (res.code === 0) {
          window.$message.success(t('drive.move.newFolderSuccess'))
          creatingParentId.value = ''
          creatingFolderName.value = ''
          return fetchTree(parentId)
        }
        window.$message.error(res.msg)
        return undefined
      })
      .finally(() => {
        creating.value = false
      })
  }

  const onCreateFolder = () => {
    if (creating.value || creatingParentId.value) return
    if (disabledIds.value.has(selectedId.value)) {
      window.$message.warning(t('drive.move.invalidTarget'))
      return
    }
    ensureExpandedTo(selectedId.value)
    const next = new Set(expandedIds.value)
    next.add(selectedId.value)
    expandedIds.value = next
    creatingFolderName.value = buildDefaultFolderName()
    creatingParentId.value = selectedId.value
    skipCreateBlur = false
  }

  const MoveTreeNode = defineComponent({
    name: 'CloudDriveMoveTreeNode',
    props: {
      node: { type: Object as PropType<TreeViewNode>, required: true },
      depth: { type: Number, required: true },
      selectedId: { type: String, required: true },
      expandedIds: { type: Object as PropType<Set<string>>, required: true },
      disabledIds: { type: Object as PropType<Set<string>>, required: true },
      folderIcon: { type: String, required: true },
      creatingParentId: { type: String, required: true },
      creatingName: { type: String, required: true }
    },
    emits: ['toggle', 'select', 'update:creatingName', 'commitCreate', 'cancelCreate'],
    setup(nodeProps, { emit: nodeEmit }) {
      const inputRef = ref<HTMLInputElement | null>(null)
      const hasChildren = computed(
        () => (nodeProps.node.children?.length || 0) > 0 || nodeProps.creatingParentId === nodeProps.node.id
      )
      const expanded = computed(() => nodeProps.expandedIds.has(nodeProps.node.id))
      const selected = computed(() => nodeProps.selectedId === nodeProps.node.id)
      const disabled = computed(() => nodeProps.disabledIds.has(nodeProps.node.id))
      const showCreating = computed(() => nodeProps.creatingParentId === nodeProps.node.id && expanded.value)

      watch(
        () => showCreating.value,
        (show) => {
          if (!show) return
          nextTick(() => {
            const input = inputRef.value
            if (!input) return
            input.focus()
            input.select()
          })
        },
        { immediate: true }
      )

      const onCreateKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          skipCreateBlur = true
          nodeEmit('commitCreate')
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          nodeEmit('cancelCreate')
        }
      }

      const onCreateBlur = () => {
        if (skipCreateBlur) {
          skipCreateBlur = false
          return
        }
        nodeEmit('commitCreate')
      }

      return () => (
        <div class="cloud-drive-move-modal__tree-branch">
          <div
            class={[
              'cloud-drive-move-modal__tree-row',
              selected.value && 'cloud-drive-move-modal__tree-row--selected',
              disabled.value && 'cloud-drive-move-modal__tree-row--disabled'
            ]}
            style={{ paddingLeft: `${nodeProps.depth * 18}px` }}
            onClick={() => {
              if (!disabled.value) nodeEmit('select', nodeProps.node.id)
            }}>
            <button
              type="button"
              class={[
                'cloud-drive-move-modal__tree-arrow',
                !hasChildren.value && 'cloud-drive-move-modal__tree-arrow--hidden',
                expanded.value && 'cloud-drive-move-modal__tree-arrow--expanded'
              ]}
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                if (hasChildren.value) nodeEmit('toggle', nodeProps.node.id)
              }}>
              <svg class="size-16px" aria-hidden="true">
                <use href="#right-arrow"></use>
              </svg>
            </button>
            <img class="cloud-drive-move-modal__tree-folder" src={nodeProps.folderIcon} alt="" draggable={false} />
            <span class="cloud-drive-move-modal__tree-name" title={nodeProps.node.fileName}>
              {nodeProps.node.fileName}
            </span>
            {selected.value && !disabled.value ? (
              <svg class="cloud-drive-move-modal__tree-check" aria-hidden="true">
                <use href="#check"></use>
              </svg>
            ) : null}
          </div>

          {expanded.value ? (
            <>
              {nodeProps.node.children.map((child) => (
                <MoveTreeNode
                  key={child.id}
                  node={child}
                  depth={nodeProps.depth + 1}
                  selectedId={nodeProps.selectedId}
                  expandedIds={nodeProps.expandedIds}
                  disabledIds={nodeProps.disabledIds}
                  folderIcon={nodeProps.folderIcon}
                  creatingParentId={nodeProps.creatingParentId}
                  creatingName={nodeProps.creatingName}
                  onToggle={(id: string) => nodeEmit('toggle', id)}
                  onSelect={(id: string) => nodeEmit('select', id)}
                  onUpdate:creatingName={(value: string) => nodeEmit('update:creatingName', value)}
                  onCommitCreate={() => nodeEmit('commitCreate')}
                  onCancelCreate={() => nodeEmit('cancelCreate')}
                />
              ))}
              {showCreating.value ? (
                <div
                  class="cloud-drive-move-modal__tree-row cloud-drive-move-modal__tree-row--creating"
                  style={{ paddingLeft: `${(nodeProps.depth + 1) * 18}px` }}
                  onMousedown={(event: MouseEvent) => event.stopPropagation()}>
                  <span class="cloud-drive-move-modal__tree-arrow cloud-drive-move-modal__tree-arrow--hidden" />
                  <img
                    class="cloud-drive-move-modal__tree-folder"
                    src={nodeProps.folderIcon}
                    alt=""
                    draggable={false}
                  />
                  <input
                    ref={inputRef}
                    class="cloud-drive-move-modal__tree-input"
                    value={nodeProps.creatingName}
                    maxlength={255}
                    onInput={(event: Event) => {
                      nodeEmit('update:creatingName', (event.target as HTMLInputElement).value)
                    }}
                    onKeydown={onCreateKeydown}
                    onBlur={onCreateBlur}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )
    }
  })

  watch(
    () => visible.value,
    (show) => {
      if (!show) {
        cancelCreateFolder()
        return
      }
      const preferId = props.initialSelectedId || SpaceRootParentId
      selectedId.value = preferId
      expandedIds.value = new Set([SpaceRootParentId])
      fetchTree(preferId)
    }
  )
</script>

<style scoped lang="scss">
  .cloud-drive-move-modal {
    width: 520px;
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
      color: var(--text-muted-color);
      cursor: pointer;

      &:hover {
        color: var(--text-color);
        background: color-mix(in srgb, var(--card-bg-color) 70%, transparent);
      }
    }

    &__sub {
      display: flex;
      align-items: center;
      padding: 0 18px 12px;
      flex-shrink: 0;
      min-width: 0;
      height: 40px;
      box-sizing: border-box;
    }

    &__breadcrumb {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 4px;
      min-width: 0;
      width: 100%;
      height: 28px;
      overflow: hidden;
      font-size: 13px;
      line-height: 1;
    }

    &__breadcrumb-sep {
      flex-shrink: 0;
      color: var(--text-muted-color);
    }

    &__breadcrumb-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
      }
    }

    &__breadcrumb-item {
      display: inline-flex;
      align-items: center;
      border: none;
      background: transparent;
      padding: 0;
      min-width: 0;
      max-width: 120px;
      height: 28px;
      font-size: 13px;
      line-height: 1;
      color: var(--text-muted-color);
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__breadcrumb-current {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      max-width: 140px;
      height: 28px;
      line-height: 1;
      color: var(--text-color);
    }

    &__breadcrumb-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__body {
      flex: 1;
      min-height: 280px;
      max-height: 420px;
      margin: 0 16px;
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      border-radius: 10px;
      overflow: hidden;
      background: var(--bg-secondary-color);
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

    &__scroll {
      height: 100%;
      max-height: 420px;
    }

    &__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 280px;
      font-size: 13px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__tree {
      padding: 8px 12px;
      box-sizing: border-box;
    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 18px;
      flex-shrink: 0;
    }

    &__footer-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    &__btn {
      min-width: 96px;
      height: 36px;
      border-radius: 8px;
      font-size: 14px;

      &--soft {
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

<style lang="scss">
  .cloud-drive-move-modal__tree-branch {
    min-width: 0;
  }

  .cloud-drive-move-modal__tree-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding-right: 8px;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.12s ease;

    &:hover:not(.cloud-drive-move-modal__tree-row--disabled):not(.cloud-drive-move-modal__tree-row--creating) {
      background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    }

    &--selected {
      background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    }

    &--disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &--creating {
      cursor: default;
      background: color-mix(in srgb, var(--primary-color) 8%, transparent);
    }
  }

  .cloud-drive-move-modal__tree-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted-color);
    cursor: pointer;
    flex-shrink: 0;
    transform: rotate(0deg);
    transition: transform 0.15s ease;

    &--expanded {
      transform: rotate(90deg);
    }

    &--hidden {
      visibility: hidden;
      pointer-events: none;
    }

    &:hover {
      color: var(--text-color);
      background: color-mix(in srgb, var(--bg-muted-color) 80%, transparent);
    }
  }

  .cloud-drive-move-modal__tree-folder {
    width: 20px;
    height: 20px;
    object-fit: contain;
    flex-shrink: 0;
    pointer-events: none;
  }

  .cloud-drive-move-modal__tree-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: var(--text-color);
  }

  .cloud-drive-move-modal__tree-check {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--primary-color);
  }

  .cloud-drive-move-modal__tree-input {
    flex: 1;
    min-width: 0;
    max-width: 280px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    outline: none;
    background: var(--bg-primary-color);
    color: var(--text-color);
    font-size: 13px;
    box-sizing: border-box;
  }
</style>
