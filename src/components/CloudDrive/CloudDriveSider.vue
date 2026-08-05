<template>
  <aside class="cloud-drive-sider" :class="{ 'cloud-drive-sider--compact': compact }">
    <n-input
      v-if="!compact"
      :value="searchKeyword"
      size="small"
      class="cloud-drive-sider__search"
      :placeholder="t('drive.searchPlaceholder')"
      clearable
      @update:value="onSearchUpdate">
      <template #prefix>
        <svg class="size-16px text-[var(--text-muted-color)]">
          <use href="#search"></use>
        </svg>
      </template>
    </n-input>
    <div v-else class="cloud-drive-sider__search-compact">
      <n-popover trigger="click" placement="right" :show-arrow="false">
        <template #trigger>
          <n-tooltip placement="right" :show-arrow="false">
            <template #trigger>
              <button type="button" class="cloud-drive-sider__nav-item cloud-drive-sider__nav-item--icon-only">
                <svg class="size-18px shrink-0 text-[var(--text-muted-color)]">
                  <use href="#search"></use>
                </svg>
              </button>
            </template>
            {{ t('drive.searchPlaceholder') }}
          </n-tooltip>
        </template>
        <n-input
          :value="searchKeyword"
          size="small"
          :placeholder="t('drive.searchPlaceholder')"
          clearable
          style="width: 200px"
          @update:value="onSearchUpdate" />
      </n-popover>
    </div>

    <n-scrollbar class="cloud-drive-sider__scroll">
      <nav class="cloud-drive-sider__nav">
        <n-tooltip placement="right" :show-arrow="false" :disabled="!compact">
          <template #trigger>
            <button
              type="button"
              class="cloud-drive-sider__nav-item"
              :class="{ active: activeMenu === 'myDrive', 'cloud-drive-sider__nav-item--icon-only': compact }"
              @click="emit('select-my-drive')">
              <svg class="size-18px shrink-0">
                <use href="#cloud"></use>
              </svg>
              <span v-show="!compact">{{ myDriveName }}</span>
            </button>
          </template>
          {{ myDriveName }}
        </n-tooltip>

        <div class="cloud-drive-sider__nav-section" :class="{ 'cloud-drive-sider__nav-section--compact': compact }">
          {{ t('drive.sidebar.shortcuts') }}
        </div>

        <n-tooltip placement="right" :show-arrow="false" :disabled="!compact">
          <template #trigger>
            <button
              type="button"
              class="cloud-drive-sider__nav-item"
              :class="{ active: activeMenu === 'recent', 'cloud-drive-sider__nav-item--icon-only': compact }"
              @click="emit('update:activeMenu', 'recent')">
              <svg class="size-18px shrink-0">
                <use href="#clock"></use>
              </svg>
              <span v-show="!compact">{{ t('drive.sidebar.recent') }}</span>
            </button>
          </template>
          {{ t('drive.sidebar.recent') }}
        </n-tooltip>

        <n-tooltip placement="right" :show-arrow="false" :disabled="!compact">
          <template #trigger>
            <button
              type="button"
              class="cloud-drive-sider__nav-item"
              :class="{ active: activeMenu === 'deleted', 'cloud-drive-sider__nav-item--icon-only': compact }"
              @click="emit('update:activeMenu', 'deleted')">
              <svg class="size-18px shrink-0">
                <use href="#recycle"></use>
              </svg>
              <span v-show="!compact">{{ t('drive.sidebar.deleted') }}</span>
            </button>
          </template>
          {{ t('drive.sidebar.deleted') }}
        </n-tooltip>
      </nav>
    </n-scrollbar>
  </aside>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  export type CloudDriveSidebarMenu = 'myDrive' | 'recent' | 'deleted'

  interface Props {
    compact?: boolean
    searchKeyword?: string
    activeMenu?: CloudDriveSidebarMenu
    myDriveName: string
  }

  withDefaults(defineProps<Props>(), {
    compact: false,
    searchKeyword: '',
    activeMenu: 'myDrive'
  })

  const emit = defineEmits<{
    'update:searchKeyword': [value: string]
    'update:activeMenu': [value: CloudDriveSidebarMenu]
    'select-my-drive': []
  }>()

  const { t } = useI18n()

  const onSearchUpdate = (value: string) => {
    emit('update:searchKeyword', value)
  }
</script>

<style scoped lang="scss">
  .cloud-drive-sider {
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

      .cloud-drive-sider__nav {
        align-items: center;
        width: 100%;
        gap: 6px;
        padding: 0 1px;
        box-sizing: border-box;
      }

      .cloud-drive-sider__scroll {
        :deep(.n-scrollbar-container),
        :deep(.n-scrollbar-content) {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
      }

      :deep(.n-tooltip),
      :deep(.n-tooltip-trigger) {
        display: flex;
        justify-content: center;
        width: 100%;
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

    &__scroll {
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
      color: var(--text-muted-color);
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
      color: var(--text-muted-color);
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
  }
</style>
