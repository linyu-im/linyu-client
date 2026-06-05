<template>
  <div class="settings-page">
    <SettingCard>
      <SettingRow :label="t('settings.shortcuts.sendMessage')">
        <n-select
          class="settings-page__select"
          :value="appSettings.shortcuts.sendMessage"
          :options="sendMessageOptions"
          size="small"
          :consistent-menu-width="true"
          @update:value="(v) => (appSettings.shortcuts.sendMessage = v)" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.sendVoice')">
        <div class="settings-page__shortcut">
          <span class="settings-page__hold">{{ t('settings.shortcuts.hold') }}</span>
          <ShortcutInput v-model="appSettings.shortcuts.sendVoice" />
        </div>
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.openUnread')">
        <ShortcutInput v-model="appSettings.shortcuts.openUnread" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.screenshot')">
        <ShortcutInput v-model="appSettings.shortcuts.screenshot" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.lock')">
        <ShortcutInput v-model="appSettings.shortcuts.lock" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.toggleWindow')">
        <ShortcutInput v-model="appSettings.shortcuts.toggleWindow" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__footer">
      <n-button size="small" @click="appSettings.resetShortcuts()">
        {{ t('settings.shortcuts.restore') }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import ShortcutInput from '@/components/Set/ShortcutInput.vue'

  const { t } = useI18n()
  const appSettings = useAppSettingsStore()

  const sendMessageOptions = computed(() => [
    { label: 'Enter', value: 'Enter' },
    { label: 'Ctrl + Enter', value: 'Ctrl+Enter' }
  ])
</script>

<style scoped lang="scss">
  .settings-page {
    &__select {
      width: 180px;
    }

    &__shortcut {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__hold {
      font-size: 12px;
      color: var(--text-secondary-color);
      white-space: nowrap;
    }

    &__footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }
  }
</style>
