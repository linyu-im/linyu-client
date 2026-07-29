<template>
  <header class="cloud-drive-header">
    <div class="cloud-drive-header__row">
      <div class="cloud-drive-header__left">
        <h1 class="cloud-drive-header__title">{{ title }}</h1>
        <div class="cloud-drive-header__storage">
          <span class="cloud-drive-header__storage-label">{{ t('drive.storage.label') }}</span>
          <n-progress
            class="cloud-drive-header__storage-bar"
            type="line"
            :percentage="storagePercent"
            :show-indicator="false"
            :height="6"
            :border-radius="3"
            color="var(--primary-color)" />
          <span class="cloud-drive-header__storage-text">
            {{ t('drive.storage.summary', { used: storageUsed, total: storageTotal }) }}
          </span>
          <span class="cloud-drive-header__storage-percent">{{ storagePercent }}%</span>
        </div>
      </div>

      <div class="cloud-drive-header__right">
        <button
          type="button"
          class="cloud-drive-header__transfer-btn"
          :title="t('drive.transfer.title')"
          @click="transferDrawerShow = true">
          <svg class="size-16px" aria-hidden="true">
            <use href="#list"></use>
          </svg>
          <span class="cloud-drive-header__transfer-btn-label">{{ t('drive.transfer.title') }}</span>
        </button>
      </div>
    </div>

    <CloudDriveTransferDrawer v-model:show="transferDrawerShow" />
  </header>
</template>

<script setup lang="ts">
  import CloudDriveTransferDrawer from '@/components/CloudDrive/CloudDriveTransferDrawer.vue'
  import { useI18n } from 'vue-i18n'

  interface Props {
    title: string
    storageUsed: string
    storageTotal: string
    storagePercent: number
  }

  defineProps<Props>()

  const { t } = useI18n()
  const transferDrawerShow = ref(false)
</script>

<style scoped lang="scss">
  .cloud-drive-header {
    flex-shrink: 0;
    margin-bottom: 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--divider-color) 88%, transparent);

    &__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-width: 0;
    }

    &__left {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }

    &__right {
      display: flex;
      align-items: center;
      flex-shrink: 0;
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

    &__transfer-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      border-radius: 8px;
      background: var(--bg-muted-color);
      color: var(--text-color);
      font-size: 13px;
      cursor: pointer;
      transition:
        color 0.12s ease,
        background 0.12s ease,
        border-color 0.12s ease;

      &:hover {
        color: var(--primary-color);
        border-color: color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
        background: color-mix(in srgb, var(--primary-color) 8%, var(--bg-muted-color));
      }
    }

    &__transfer-btn-label {
      white-space: nowrap;
      user-select: none;
    }
  }

  @media (max-width: 900px) {
    .cloud-drive-header__storage {
      gap: 6px;
      padding: 5px 8px;
    }

    .cloud-drive-header__storage-bar {
      width: 64px;
      min-width: 40px;
      max-width: 64px;
    }

    .cloud-drive-header__storage-text,
    .cloud-drive-header__storage-percent,
    .cloud-drive-header__storage-label {
      font-size: 11px;
    }

    .cloud-drive-header__transfer-btn-label {
      display: none;
    }

    .cloud-drive-header__transfer-btn {
      width: 32px;
      padding: 0;
    }
  }

  @media (max-width: 760px) {
    .cloud-drive-header__storage-label {
      display: none;
    }

    .cloud-drive-header__storage-bar {
      width: 52px;
      min-width: 36px;
      max-width: 52px;
    }
  }
</style>
