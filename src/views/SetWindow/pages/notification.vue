<template>
  <div class="settings-page">
    <div class="settings-page__section-title">{{ t('settings.notification.soundSection') }}</div>
    <SettingCard>
      <SettingRow :label="t('settings.notification.messageSound')">
        <n-switch v-model:value="appSettings.notifications.messageSound" />
      </SettingRow>
      <SettingRow :label="t('settings.notification.callSound')">
        <n-switch v-model:value="appSettings.notifications.callSound" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__section-title">{{ t('settings.notification.badgeSection') }}</div>
    <SettingCard>
      <SettingRow :label="t('settings.notification.badgeMoments')">
        <template #label>
          <div class="settings-page__label-with-icon">
            <svg class="size-16px" aria-hidden="true">
              <use href="#moment"></use>
            </svg>
            <span>{{ t('settings.notification.badgeMoments') }}</span>
          </div>
        </template>
        <n-switch v-model:value="appSettings.notifications.badgeMoments" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__section-title">{{ t('settings.notification.momentsSection') }}</div>
    <SettingCard>
      <SettingRow
        :label="t('settings.notification.momentsInteraction')"
        :desc="t('settings.notification.momentsInteractionDesc')">
        <n-switch v-model:value="appSettings.notifications.momentsInteraction" />
      </SettingRow>
    </SettingCard>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'

  const { t } = useI18n()
  const appSettings = useAppSettingsStore()
</script>

<style scoped lang="scss">
  .settings-page {
    &__section-title {
      margin: 0 0 8px 2px;
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    &__section-title + .setting-card {
      margin-bottom: 14px;
    }

    &__label-with-icon {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-color);
    }
  }
</style>
