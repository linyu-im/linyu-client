<template>
  <div class="settings-page">
    <div class="settings-page__section-title">{{ t('settings.general.languageSection') }}</div>
    <SettingCard>
      <SettingRow :label="t('settings.general.language')">
        <n-select
          class="settings-page__select"
          :value="systemSetting.preferences.lang"
          :options="languageOptions"
          size="small"
          :consistent-menu-width="true"
          @update:value="onLanguageChange" />
      </SettingRow>
      <SettingRow :label="t('settings.general.translateTo')">
        <n-select
          class="settings-page__select"
          :value="appSettings.general.translateTo"
          :options="translateOptions"
          size="small"
          :consistent-menu-width="true"
          @update:value="(v) => appSettings.setGeneralField('translateTo', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.general.autoTranslate')" :desc="t('settings.general.autoTranslateDesc')">
        <n-switch
          :value="appSettings.general.autoTranslate"
          @update:value="(v) => appSettings.setGeneralField('autoTranslate', v)" />
      </SettingRow>
    </SettingCard>

    <div class="settings-page__section-title">{{ t('settings.general.appearanceSection') }}</div>
    <SettingCard>
      <SettingRow :label="t('settings.general.appearance')">
        <n-select
          class="settings-page__select"
          :value="systemSetting.themes.pattern"
          :options="appearanceOptions"
          size="small"
          :consistent-menu-width="true"
          @update:value="onAppearanceChange" />
      </SettingRow>
      <SettingRow :label="t('settings.general.fontSize')" stack>
        <template #default>
          <div class="settings-page__slider">
            <n-slider
              :value="appSettings.general.fontSize"
              :step="1"
              @update:value="(v) => appSettings.setGeneralField('fontSize', v)" />
            <div class="settings-page__slider-labels">
              <span>{{ t('settings.general.fontSmall') }}</span>
              <span>{{ t('settings.general.fontStandard') }}</span>
              <span>{{ t('settings.general.fontLarge') }}</span>
            </div>
          </div>
        </template>
      </SettingRow>
    </SettingCard>

    <SettingCard>
      <SettingRow :label="t('settings.general.autoLaunchOnStartup')">
        <n-switch
          :value="appSettings.general.autoLaunchOnStartup"
          :loading="autostartLoading"
          @update:value="onAutoLaunchChange" />
      </SettingRow>
      <SettingRow :label="t('settings.general.closeMainPanel')">
        <n-select
          class="settings-page__select"
          :value="appSettings.general.closeMainPanelAction"
          :options="closeMainPanelOptions"
          size="small"
          :consistent-menu-width="true"
          @update:value="(v) => appSettings.setGeneralField('closeMainPanelAction', v)" />
      </SettingRow>
      <SettingRow :label="t('settings.general.voiceToText')">
        <n-switch
          :value="appSettings.general.voiceToText"
          @update:value="(v) => appSettings.setGeneralField('voiceToText', v)" />
      </SettingRow>
    </SettingCard>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { LangEnum, ThemePatternEnum } from '@/constants/system'
  import { useSystemSettingStore } from '@/stores/app/systemSetting'
  import { useAppSettingsStore, type CloseMainPanelAction } from '@/stores/app/appSettings'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import { readAutostartEnabled, syncAutostart } from '@/utils/desktop/autostart'

  const { t } = useI18n()
  const systemSetting = useSystemSettingStore()
  const appSettings = useAppSettingsStore()
  const autostartLoading = ref(false)

  const languageOptions = computed(() => [
    { label: '中文', value: LangEnum.ZH },
    { label: 'English', value: LangEnum.EN }
  ])

  const translateOptions = computed(() => [
    { label: '中文', value: 'zh' },
    { label: 'English', value: 'en' }
  ])

  const closeMainPanelOptions = computed(() => [
    { label: t('settings.general.closeMinimizeToTray'), value: 'minimizeToTray' satisfies CloseMainPanelAction },
    { label: t('settings.general.closeExitApp'), value: 'exit' satisfies CloseMainPanelAction }
  ])

  const appearanceOptions = computed(() => [
    { label: t('login.settings.theme.system'), value: ThemePatternEnum.OS },
    { label: t('login.settings.theme.light'), value: ThemePatternEnum.LIGHT },
    { label: t('login.settings.theme.dark'), value: ThemePatternEnum.DARK }
  ])

  const onLanguageChange = (lang: LangEnum) => {
    systemSetting.setLang(lang)
  }

  const onAppearanceChange = (pattern: ThemePatternEnum) => {
    systemSetting.setThemePattern(pattern)
  }

  const onAutoLaunchChange = (enabled: boolean) => {
    const prev = appSettings.general.autoLaunchOnStartup
    appSettings.setGeneralField('autoLaunchOnStartup', enabled)
    autostartLoading.value = true
    syncAutostart(enabled)
      .then(() => undefined)
      .catch(() => {
        appSettings.setGeneralField('autoLaunchOnStartup', prev)
        window.$message?.error(t('settings.general.autoLaunchFailed'))
      })
      .finally(() => {
        autostartLoading.value = false
      })
  }

  onMounted(() => {
    readAutostartEnabled()
      .then((enabled) => {
        if (enabled !== appSettings.general.autoLaunchOnStartup) {
          appSettings.setGeneralField('autoLaunchOnStartup', enabled)
        }
      })
      .catch(() => undefined)
  })
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

    &__select {
      width: 160px;
    }

    &__slider {
      width: 100%;
      padding-top: 4px;
    }

    &__slider-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted-color);
    }
  }
</style>
