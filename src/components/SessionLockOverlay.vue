<template>
  <div class="session-lock">
    <div class="session-lock__toolbar">
      <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
      <SvgIconButton
        :href="isMaximize ? '#restore' : '#maximize'"
        @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximize = !v))" />
      <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="onClose" />
    </div>

    <div class="session-lock__body">
      <img class="session-lock__hero" src="/lock.png" alt="" draggable="false" />
      <h1 class="session-lock__title">{{ t('sessionLock.title') }}</h1>
      <p class="session-lock__desc">{{ t('sessionLock.desc') }}</p>

      <n-input
        v-model:value="password"
        class="session-lock__input"
        type="password"
        show-password-on="click"
        size="large"
        :placeholder="t('sessionLock.passwordPlaceholder')"
        :disabled="loading"
        @keydown.enter="onUnlock">
        <template #prefix>
          <svg class="session-lock__input-icon"><use href="#lock" /></svg>
        </template>
      </n-input>

      <n-button
        class="session-lock__submit"
        type="primary"
        size="large"
        block
        :loading="loading"
        :disabled="!password.trim()"
        @click="onUnlock">
        {{ t('sessionLock.unlock') }}
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { authApi } from '@/api'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { useSessionLockStore } from '@/stores/app/sessionLock'
  import {
    exitApp,
    hideCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow
  } from '@/utils/desktop/window'

  const { t } = useI18n()
  const appSettings = useAppSettingsStore()
  const sessionLock = useSessionLockStore()

  const password = ref('')
  const loading = ref(false)
  const isMaximize = ref(false)
  let unlistenResized: (() => void) | undefined

  const syncMaximized = () => {
    void WebviewWindow.getCurrent()
      .isMaximized()
      .then((value) => {
        isMaximize.value = value
      })
  }

  onMounted(() => {
    syncMaximized()
    void WebviewWindow.getCurrent()
      .onResized?.(() => {
        syncMaximized()
      })
      .then((unlisten) => {
        unlistenResized = unlisten
      })
  })

  onUnmounted(() => {
    unlistenResized?.()
  })

  const onClose = () => {
    if (appSettings.general.closeMainPanelAction === 'exit') {
      exitApp()
    } else {
      hideCurrentWindow()
    }
  }

  const onUnlock = () => {
    const value = password.value.trim()
    if (!value || loading.value) return

    loading.value = true
    authApi
      .verifyPassword({ password: value })
      .then((res) => {
        if (res.code === 0 && res.data) {
          password.value = ''
          sessionLock.unlock()
          return
        }
        window.$message.error(res.msg || t('sessionLock.verifyFailed'))
      })
      .finally(() => {
        loading.value = false
      })
  }
</script>

<style lang="scss" scoped>
  .session-lock {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary-color);
    color: var(--text-color);
    user-select: none;

    &__toolbar {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      height: 38px;
      padding-right: 3px;
      /* 保证可点到按钮，拖拽留给左侧空白 */
      :deep(.svg-icon-button),
      button {
        -webkit-app-region: no-drag;
      }
    }

    &__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px 64px;
      box-sizing: border-box;
    }

    &__hero {
      width: 120px;
      height: 120px;
      margin-bottom: 28px;
      object-fit: contain;
      pointer-events: none;
    }

    &__title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.3;
      color: var(--text-color);
    }

    &__desc {
      margin: 12px 0 0;
      max-width: 420px;
      text-align: center;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__input {
      width: min(360px, 100%);
      margin-top: 36px;
    }

    &__input-icon {
      width: 16px;
      height: 16px;
      color: var(--text-secondary-color);
    }

    &__submit {
      width: min(360px, 100%);
      margin-top: 16px;
    }
  }
</style>
