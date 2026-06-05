<template>
  <div class="settings-page">
    <SettingCard>
      <div class="settings-page__empty">
        <svg class="settings-page__empty-icon" aria-hidden="true">
          <use href="#application"></use>
        </svg>
        <p class="settings-page__empty-title">{{ t('settings.plugins.emptyTitle') }}</p>
        <p class="settings-page__empty-desc">{{ t('settings.plugins.emptyDesc') }}</p>
      </div>
    </SettingCard>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import SettingCard from '@/components/Set/SettingCard.vue'

  const { t } = useI18n()
</script>

<style scoped lang="scss">
  .settings-page {
    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    &__empty-icon {
      width: 40px;
      height: 40px;
      color: var(--text-secondary-color);
      opacity: 0.7;
    }

    &__empty-title {
      margin: 14px 0 6px;
      font-size: 14px;
      color: var(--text-color);
    }

    &__empty-desc {
      margin: 0;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }
  }
</style>
