<template>
  <div class="settings-page">
    <div class="settings-page__main">
      <SettingCard>
        <SettingRow :label="t('settings.about.version')" :desc="appVersion" :border="false">
          <n-button size="small" @click="onTodo">{{ t('settings.about.checkUpdate') }}</n-button>
        </SettingRow>
        <SettingRow :label="t('settings.about.help')">
          <n-button size="small" @click="onTodo">{{ t('settings.about.viewHelp') }}</n-button>
        </SettingRow>
      </SettingCard>
    </div>

    <footer class="settings-page__footer">
      <div class="settings-page__footer-links">
        <button type="button" class="settings-page__link" @click="onTodo">{{ t('settings.about.terms') }}</button>
        <span class="settings-page__sep">|</span>
        <button type="button" class="settings-page__link" @click="onTodo">{{ t('settings.about.privacy') }}</button>
        <span class="settings-page__sep">|</span>
        <button type="button" class="settings-page__link" @click="onTodo">{{ t('settings.about.feedback') }}</button>
        <span class="settings-page__sep">|</span>
        <button type="button" class="settings-page__link" @click="onTodo">{{ t('settings.about.uploadLogs') }}</button>
      </div>

      <div class="settings-page__copyright">
        <p>{{ t('settings.about.copyright') }}</p>
        <p>{{ t('settings.about.rights') }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'

  const { t } = useI18n()

  const appVersion = '0.1.0'

  const onTodo = () => {
    window.$message?.info(t('settings.todo'))
  }
</script>

<style scoped lang="scss">
  .settings-page {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 66px);
    box-sizing: border-box;

    &__main {
      flex: 1 0 auto;
    }

    &__footer {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 32px;
      padding-bottom: 8px;
    }

    &__footer-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
    }

    &__link {
      padding: 0;
      border: none;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      transition: color 0.15s ease;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__sep {
      color: var(--text-muted-color);
      opacity: 0.6;
    }

    &__copyright {
      margin-top: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted-color);
      line-height: 1.6;

      p {
        margin: 0;
      }
    }
  }
</style>
