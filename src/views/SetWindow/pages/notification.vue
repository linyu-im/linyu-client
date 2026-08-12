<template>
  <div class="settings-page">
    <div class="settings-page__section-title">{{ t('settings.notification.soundSection') }}</div>
    <SettingCard>
      <SettingRow :label="t('settings.notification.messageSound')">
        <n-switch
          :value="appSettings.notifications.messageSound"
          @update:value="(v) => appSettings.setNotificationFlag('messageSound', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.notification.callSound')">
        <n-switch
          :value="appSettings.notifications.callSound"
          @update:value="(v) => appSettings.setNotificationFlag('callSound', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.notification.driveSound')">
        <n-switch
          :value="appSettings.notifications.driveSound"
          @update:value="(v) => appSettings.setNotificationFlag('driveSound', v)" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__section-title">{{ t('settings.notification.badgeSection') }}</div>
    <SettingCard>
      <SettingRow v-for="item in badgeOptions" :key="item.slot" :label="t(item.labelKey)">
        <template #label>
          <div class="settings-page__label-with-icon">
            <svg class="size-16px" aria-hidden="true">
              <use :href="item.icon"></use>
            </svg>
            <span>{{ t(item.labelKey) }}</span>
          </div>
        </template>
        <n-switch
          :value="appSettings.notifications.badges[item.slot]"
          @update:value="(v) => appSettings.setBadgeEnabled(item.slot, v)" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__section-title">{{ t('settings.notification.momentsSection') }}</div>
    <SettingCard>
      <SettingRow
        :label="t('settings.notification.momentsInteraction')"
        :desc="t('settings.notification.momentsInteractionDesc')">
        <n-switch
          :value="appSettings.notifications.momentsInteraction"
          @update:value="(v) => appSettings.setNotificationFlag('momentsInteraction', v)" />
      </SettingRow>
    </SettingCard>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useAppSettingsStore, type NotificationBadgeSlot } from '@/stores/app/appSettings'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'

  const { t } = useI18n()
  const appSettings = useAppSettingsStore()

  const badgeOptions: Array<{ slot: NotificationBadgeSlot; labelKey: string; icon: string }> = [
    { slot: 'moment', labelKey: 'settings.notification.badgeMoment', icon: '#moment' },
    { slot: 'ai', labelKey: 'settings.notification.badgeAi', icon: '#ai' },
    { slot: 'drive', labelKey: 'settings.notification.badgeDrive', icon: '#drive' },
    { slot: 'application', labelKey: 'settings.notification.badgeApplication', icon: '#application' }
  ]
</script>

<style scoped lang="scss">
  .settings-page {
    &__section-title {
      margin: 0 0 8px 2px;
      font-size: 13px;
      color: var(--text-muted-color);
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
