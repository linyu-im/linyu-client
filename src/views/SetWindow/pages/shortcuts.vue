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
          @update:value="(v) => onSetShortcut('sendMessage', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.sendVoice')">
        <div class="settings-page__shortcut">
          <span class="settings-page__hold">{{ t('settings.shortcuts.hold') }}</span>
          <ShortcutInput
            :model-value="appSettings.shortcuts.sendVoice"
            :error="errors.sendVoice"
            :conflict="shortcutConflict.keys.includes('sendVoice')"
            @update:model-value="(v) => onSetShortcut('sendVoice', v)" />
        </div>
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.openUnread')">
        <ShortcutInput
          :model-value="appSettings.shortcuts.openUnread"
          :error="errors.openUnread"
          :conflict="shortcutConflict.keys.includes('openUnread')"
          @update:model-value="(v) => onSetShortcut('openUnread', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.screenshot')">
        <ShortcutInput
          :model-value="appSettings.shortcuts.screenshot"
          :error="errors.screenshot"
          :conflict="shortcutConflict.keys.includes('screenshot')"
          @update:model-value="(v) => onSetShortcut('screenshot', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.lock')">
        <ShortcutInput
          :model-value="appSettings.shortcuts.lock"
          :error="errors.lock"
          :conflict="shortcutConflict.keys.includes('lock')"
          @update:model-value="(v) => onSetShortcut('lock', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.shortcuts.toggleWindow')">
        <ShortcutInput
          :model-value="appSettings.shortcuts.toggleWindow"
          :error="errors.toggleWindow"
          :conflict="shortcutConflict.keys.includes('toggleWindow')"
          @update:model-value="(v) => onSetShortcut('toggleWindow', v)" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__footer">
      <n-button size="small" @click="onReset">
        {{ t('settings.shortcuts.restore') }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useAppSettingsStore, type ShortcutKey } from '@/stores/app/appSettings'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import ShortcutInput from '@/components/Set/ShortcutInput.vue'
  import { findShortcutConflict, getShortcutActionLabel, type ShortcutBindingKey } from '@/utils/desktop/shortcuts'
  import { useShortcutConflictStore } from '@/stores/app/shortcutConflict'

  const { t } = useI18n()
  const appSettings = useAppSettingsStore()
  const shortcutConflict = useShortcutConflictStore()

  const BINDING_KEYS: ShortcutBindingKey[] = ['sendVoice', 'openUnread', 'screenshot', 'lock', 'toggleWindow']

  const errors = reactive<Partial<Record<ShortcutBindingKey, string>>>({})

  const sendMessageOptions = computed(() => [
    { label: 'Enter', value: 'Enter' },
    { label: 'Ctrl + Enter', value: 'Ctrl+Enter' }
  ])

  const clearError = (key: ShortcutBindingKey) => {
    delete errors[key]
  }

  const onSetShortcut = (key: ShortcutKey, value: string) => {
    if (key === 'sendMessage') {
      appSettings.setShortcut(key, value)
      return
    }

    const bindingKey = key as ShortcutBindingKey
    if (!value) {
      clearError(bindingKey)
      appSettings.setShortcut(key, value)
      return
    }

    const conflict = findShortcutConflict(bindingKey, value, {
      sendVoice: appSettings.shortcuts.sendVoice,
      openUnread: appSettings.shortcuts.openUnread,
      screenshot: appSettings.shortcuts.screenshot,
      lock: appSettings.shortcuts.lock,
      toggleWindow: appSettings.shortcuts.toggleWindow
    })

    if (conflict) {
      errors[bindingKey] = t('settings.shortcuts.conflict', {
        name: getShortcutActionLabel(conflict)
      })
      return
    }

    clearError(bindingKey)
    appSettings.setShortcut(key, value)
  }

  const onReset = () => {
    BINDING_KEYS.forEach(clearError)
    appSettings.resetShortcuts()
  }
</script>

<style scoped lang="scss">
  .settings-page {
    &__select {
      width: 180px;
    }

    &__shortcut {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    &__hold {
      font-size: 12px;
      color: var(--text-muted-color);
      white-space: nowrap;
      line-height: 28px;
    }

    &__footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }
  }
</style>
