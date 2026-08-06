<template>
  <n-config-provider :theme-overrides="settingsThemeOverrides">
    <div class="set-window">
      <div data-tauri-drag-region class="set-window__toolbar">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>

      <div class="set-window__body">
        <aside class="set-window__sider">
          <button
            v-for="item in menuItems"
            :key="item.key"
            type="button"
            class="set-window__nav"
            :class="{ 'set-window__nav--active': activeKey === item.key }"
            @click="activeKey = item.key">
            <svg class="set-window__nav-icon" aria-hidden="true">
              <use :href="item.icon"></use>
            </svg>
            <span class="set-window__nav-label">{{ t(item.labelKey) }}</span>
          </button>
        </aside>

        <n-scrollbar class="set-window__content">
          <component :is="activePage" />
        </n-scrollbar>
      </div>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
  import '@/components/Set/settingsSelect.scss'
  import { computed, markRaw, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { listen, type UnlistenFn } from '@tauri-apps/api/event'
  import type { GlobalThemeOverrides } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import SvgIconButton from '@/components/SvgIconButton.vue'
  import { SETTINGS_NAVIGATE_EVENT } from '@/constants/event'
  import { closeCurrentWindow, minimizeCurrentWindow, ShowCurrentWindow } from '@/utils/desktop/window'
  import AccountPage from './pages/account.vue'
  import GeneralPage from './pages/general.vue'
  import ShortcutsPage from './pages/shortcuts.vue'
  import NotificationPage from './pages/notification.vue'
  import PluginsPage from './pages/plugins.vue'
  import AboutPage from './pages/about.vue'
  import WorkAssistantPage from './pages/work-assistant.vue'

  type SettingsMenuKey = 'account' | 'general' | 'shortcuts' | 'notification' | 'work' | 'plugins' | 'about'

  const { t } = useI18n()
  const route = useRoute()
  const routeTab = String(route.query.tab || '')
  const activeKey = ref<SettingsMenuKey>(routeTab === 'work' ? 'work' : 'account')

  const mutedButtonText = {
    textColor: 'var(--text-muted-color)',
    textColorHover: 'var(--text-muted-color)',
    textColorPressed: 'var(--text-muted-color)',
    textColorFocus: 'var(--text-muted-color)',
    textColorDisabled: 'var(--text-muted-color)',
    textColorText: 'var(--text-muted-color)',
    textColorTextHover: 'var(--text-muted-color)',
    textColorTextPressed: 'var(--text-muted-color)',
    textColorTextFocus: 'var(--text-muted-color)',
    textColorTextDisabled: 'var(--text-muted-color)',
    textColorGhost: 'var(--text-muted-color)',
    textColorGhostHover: 'var(--text-muted-color)',
    textColorGhostPressed: 'var(--text-muted-color)',
    textColorGhostFocus: 'var(--text-muted-color)',
    textColorGhostDisabled: 'var(--text-muted-color)'
  }

  const settingsThemeOverrides: GlobalThemeOverrides = {
    Button: {
      ...mutedButtonText,
      textColorPrimary: '#FFF',
      textColorHoverPrimary: '#FFF',
      textColorPressedPrimary: '#FFF',
      textColorFocusPrimary: '#FFF',
      textColorDisabledPrimary: '#FFF'
    }
  }

  const menuItems: { key: SettingsMenuKey; labelKey: string; icon: string }[] = [
    { key: 'account', labelKey: 'settings.menu.account', icon: '#user' },
    { key: 'general', labelKey: 'settings.menu.general', icon: '#settings' },
    { key: 'shortcuts', labelKey: 'settings.menu.shortcuts', icon: '#keyboard' },
    { key: 'notification', labelKey: 'settings.menu.notification', icon: '#alarm' },
    { key: 'work', labelKey: 'settings.menu.work', icon: '#ai' },
    { key: 'plugins', labelKey: 'settings.menu.plugins', icon: '#plug' },
    { key: 'about', labelKey: 'settings.menu.about', icon: '#info' }
  ]

  const pageMap = {
    account: markRaw(AccountPage),
    general: markRaw(GeneralPage),
    shortcuts: markRaw(ShortcutsPage),
    notification: markRaw(NotificationPage),
    work: markRaw(WorkAssistantPage),
    plugins: markRaw(PluginsPage),
    about: markRaw(AboutPage)
  }

  const activePage = computed(() => pageMap[activeKey.value])
  let unlistenSettingsNavigation: UnlistenFn | undefined

  onMounted(async () => {
    unlistenSettingsNavigation = await listen<{ tab?: string }>(SETTINGS_NAVIGATE_EVENT, (event) => {
      const tab = event.payload.tab
      if (tab && tab in pageMap) activeKey.value = tab as SettingsMenuKey
    })
    nextTick(() => {
      ShowCurrentWindow()
    })
  })

  onBeforeUnmount(() => unlistenSettingsNavigation?.())
</script>

<style scoped lang="scss">
  .set-window {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background: linear-gradient(to bottom, rgb(var(--bg-muted-rgb), 0.85), rgb(var(--bg-secondary-rgb), 0.75));
    user-select: none;

    &__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: 38px;
      padding: 0 3px;
    }

    &__body {
      flex: 1;
      display: flex;
      min-height: 0;
      padding: 0 12px 12px;
      gap: 12px;
    }

    &__sider {
      flex-shrink: 0;
      width: 168px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 6px;
      border-radius: 10px;
      background-color: color-mix(in srgb, var(--card-bg-color) 35%, transparent);
    }

    &__nav {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted-color);
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;

      &:hover:not(&--active) {
        background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
        color: var(--text-color);
      }

      &--active,
      &--active:hover {
        background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
        color: var(--primary-color);
      }
    }

    &__nav-icon {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      color: var(--text-muted-color);
      transition: color 0.15s ease;
    }

    &__nav:hover:not(&__nav--active) &__nav-icon {
      color: var(--text-color);
    }

    &__nav--active &__nav-icon,
    &__nav--active:hover &__nav-icon {
      color: var(--primary-color);
    }

    &__nav-label {
      line-height: 1.3;
    }

    &__content {
      flex: 1;
      min-width: 0;
      min-height: 0;

      :deep(.n-scrollbar-container) {
        height: 100%;
        max-height: 100%;
      }

      :deep(.n-scrollbar-content) {
        padding: 8px 4px 8px 0;
        box-sizing: border-box;
      }
    }
  }
</style>
