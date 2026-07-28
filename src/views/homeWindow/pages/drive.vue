<template>
  <div ref="cloudDriveRef" class="cloud-drive">
    <Split :default-size="splitDefaultSize" :min-size="splitMinSize" :max-size="splitMaxSize">
      <template #first>
        <CloudDriveSider
          v-model:search-keyword="searchKeyword"
          v-model:active-menu="activeMenu"
          :compact="siderCompact"
          :my-drive-name="myDriveName"
          @select-my-drive="onSelectMyDrive" />
      </template>

      <template #second>
        <div class="cloud-drive__main">
          <div class="cloud-drive__main-body">
            <div class="cloud-drive__content">
              <CloudDriveRecyclePanel
                v-if="activeMenu === 'deleted'"
                :search-keyword="searchKeyword"
                @restored="fetchUserSpace"
                @deleted="fetchUserSpace"
                @cleared="fetchUserSpace" />
              <CloudDriveFilePanel
                v-else
                ref="filePanelRef"
                :title="myDriveName"
                :search-keyword="searchKeyword"
                :storage-used="storageUsed"
                :storage-total="storageTotal"
                :storage-percent="storagePercent"
                @deleted="fetchUserSpace" />
            </div>
          </div>
        </div>
      </template>
    </Split>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'drive' })
  import CloudDriveFilePanel from '@/components/CloudDrive/CloudDriveFilePanel.vue'
  import CloudDriveRecyclePanel from '@/components/CloudDrive/CloudDriveRecyclePanel.vue'
  import CloudDriveSider, { type CloudDriveSidebarMenu } from '@/components/CloudDrive/CloudDriveSider.vue'
  import { spaceApi } from '@/api'
  import type { Space } from '@/types/api/space'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const SIDER_WIDTH_EXPANDED = 220
  const SIDER_WIDTH_COMPACT = 60
  const MAIN_MIN_WIDTH = 680

  const cloudDriveRef = ref<HTMLElement | null>(null)
  const siderCompact = ref(false)
  const searchKeyword = ref('')
  const activeMenu = ref<CloudDriveSidebarMenu>('myDrive')
  const spaceInfo = ref<Space | null>(null)
  const filePanelRef = ref<InstanceType<typeof CloudDriveFilePanel> | null>(null)

  const splitDefaultSize = computed(() => (siderCompact.value ? SIDER_WIDTH_COMPACT : SIDER_WIDTH_EXPANDED))
  const splitMinSize = computed(() => (siderCompact.value ? SIDER_WIDTH_COMPACT : 160))
  const splitMaxSize = computed(() => (siderCompact.value ? SIDER_WIDTH_COMPACT : 280))

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
    return `${(bytes / 1024 / 1024 / 1024 / 1024).toFixed(1)} TB`
  }

  const myDriveName = computed(() => spaceInfo.value?.spaceName?.trim() || t('drive.sidebar.myDrive'))
  const storageUsed = computed(() => formatBytes(spaceInfo.value?.usedBytes ?? 0))
  const storageTotal = computed(() => formatBytes(spaceInfo.value?.quotaBytes ?? 0))
  const storagePercent = computed(() => {
    const total = spaceInfo.value?.quotaBytes ?? 0
    if (total <= 0) return 0
    return Math.min(100, Math.round(((spaceInfo.value?.usedBytes ?? 0) / total) * 100))
  })

  const fetchUserSpace = () => {
    spaceApi.getUserInfo().then((res) => {
      if (res.code === 0 && res.data) {
        spaceInfo.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onSelectMyDrive = () => {
    activeMenu.value = 'myDrive'
    filePanelRef.value?.resetToRoot()
  }

  const updateSiderCompact = (containerWidth: number) => {
    siderCompact.value = containerWidth < MAIN_MIN_WIDTH + SIDER_WIDTH_EXPANDED + 16
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    fetchUserSpace()

    const el = cloudDriveRef.value
    if (!el) return

    updateSiderCompact(el.clientWidth)
    resizeObserver = new ResizeObserver(([entry]) => {
      updateSiderCompact(entry.contentRect.width)
    })
    resizeObserver.observe(el)
  })

  onActivated(() => {
    fetchUserSpace()
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
  }
</style>
