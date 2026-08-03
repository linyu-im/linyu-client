<template>
  <div class="settings-plugins">
    <div class="settings-plugins__header">
      <div>
        <h2>{{ t('settings.plugins.title') }}</h2>
        <p>{{ t('settings.plugins.description') }}</p>
      </div>
      <n-button size="small" @click="onOpenPluginCenter">
        {{ t('settings.plugins.openCenter') }}
      </n-button>
    </div>

    <SettingCard>
      <SettingRow :label="t('settings.plugins.developerMode')" :desc="t('settings.plugins.developerModeDesc')">
        <n-switch :value="pluginStore.developerMode" @update:value="pluginStore.setDeveloperMode" />
      </SettingRow>
      <SettingRow
        :label="t('settings.plugins.storagePath')"
        :desc="t('settings.plugins.storagePathDesc')"
        :border="false"
        stack>
        <code class="settings-plugins__storage-path">{{ pluginSystemPath }}</code>
      </SettingRow>
    </SettingCard>

    <div class="settings-plugins__section-title">
      <span>{{ t('settings.plugins.installedTitle') }}</span>
      <small>{{ t('settings.plugins.count', { count: allPlugins.length }) }}</small>
    </div>

    <SettingCard v-if="allPlugins.length > 0">
      <div v-for="(plugin, index) in allPlugins" :key="plugin.id" class="settings-plugins__item">
        <div class="settings-plugins__identity">
          <div class="settings-plugins__icon" :class="{ 'settings-plugins__icon-image': Boolean(plugin.iconUrl) }">
            <img v-if="plugin.iconUrl" :src="plugin.iconUrl" alt="" />
            <svg v-else><use href="#plug" /></svg>
          </div>
          <div>
            <div class="settings-plugins__name">
              <strong>{{ plugin.name }}</strong>
              <span>v{{ plugin.version }}</span>
              <span v-if="plugin.local" class="settings-plugins__local">{{ t('application.source.local') }}</span>
            </div>
            <p>{{ plugin.description }}</p>
          </div>
        </div>

        <div class="settings-plugins__actions">
          <div class="settings-plugins__action-item">
            <n-switch
              :value="plugin.enabled"
              size="small"
              :loading="plugin.busy"
              @update:value="onTogglePlugin(plugin, $event)" />
          </div>
          <div class="settings-plugins__action-item">
            <SvgIconButton
              class="settings-plugins__icon-btn"
              href="#open"
              :size="16"
              :radius="3"
              icon-size="100%"
              :disabled="plugin.busy"
              @click="onOpenPlugin(plugin)" />
          </div>
          <div
            class="settings-plugins__action-item"
            :class="{ 'settings-plugins__action-item--disabled': plugin.busy }">
            <n-popconfirm @positive-click="onRemovePlugin(plugin)">
              <template #trigger>
                <SvgIconButton
                  class="settings-plugins__icon-btn"
                  href="#trash"
                  :size="16"
                  :radius="3"
                  icon-size="100%"
                  :disabled="plugin.busy" />
              </template>
              {{ t('settings.plugins.removeConfirm', { name: plugin.name }) }}
            </n-popconfirm>
          </div>
        </div>

        <div v-if="index < allPlugins.length - 1" class="settings-plugins__divider" />
      </div>
    </SettingCard>

    <SettingCard v-else>
      <div class="settings-plugins__empty">
        <svg><use href="#application" /></svg>
        <strong>{{ t('settings.plugins.emptyTitle') }}</strong>
        <p>{{ t('settings.plugins.emptyDesc') }}</p>
      </div>
    </SettingCard>
  </div>
</template>

<script setup lang="ts">
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import * as pluginService from '@/services/pluginService'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import { usePluginStore } from '@/stores/app/plugin'
  import { createPluginUiWindow, openAndFocusWindow } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'

  interface SettingsPluginItem {
    id: string
    name: string
    version: string
    description: string
    iconUrl: string
    enabled: boolean
    local: boolean
    busy: boolean
  }

  const { t } = useI18n()
  const pluginStore = usePluginStore()
  const homeTabStore = useHomeTabStore()
  const pluginSystemPath = ref('')

  const allPlugins = computed<SettingsPluginItem[]>(() =>
    pluginStore.installedPlugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      iconUrl: plugin.iconUrl,
      enabled: plugin.enabled,
      local: plugin.source === 'development' || plugin.source === 'local',
      busy: pluginStore.operationIds.includes(plugin.id)
    }))
  )

  const onOpenPluginCenter = () => {
    homeTabStore.navigateTo('application')
    openAndFocusWindow('home')
  }

  const onTogglePlugin = (plugin: SettingsPluginItem, enabled: boolean) => {
    pluginStore.setPluginEnabled(plugin.id, enabled).catch((error) => window.$message.error(String(error)))
  }

  const onOpenPlugin = (plugin: SettingsPluginItem) => {
    const installed = pluginStore.installedPlugins.find((item) => item.id === plugin.id)
    if (!installed) return
    createPluginUiWindow(installed).catch((error) => window.$message.error(String(error)))
  }

  const onRemovePlugin = (plugin: SettingsPluginItem) => {
    pluginStore.uninstallPlugin(plugin.id).catch((error) => window.$message.error(String(error)))
  }

  onMounted(() => {
    pluginService
      .getSystemInfo()
      .then((info) => {
        pluginSystemPath.value = info.rootPath
      })
      .catch((error) => window.$message.error(String(error)))
    pluginStore.refresh().catch((error) => window.$message.error(String(error)))
  })
</script>

<style scoped lang="scss">
  .settings-plugins {
    &__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
      padding: 0 4px;

      h2 {
        margin: 0;
        color: var(--text-color);
        font-size: 16px;
      }

      p {
        margin: 5px 0 0;
        color: var(--text-secondary-color);
        font-size: 11px;
      }
    }

    &__section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 18px 4px 8px;
      color: var(--text-color);
      font-size: 12px;

      small {
        color: var(--text-secondary-color);
        font-size: 10px;
      }
    }

    &__storage-path {
      display: block;
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      overflow-wrap: anywhere;
      color: var(--text-secondary-color);
      background-color: var(--bg-secondary-color);
      font-size: 10px;
      box-sizing: border-box;
      user-select: text;
    }

    &__item {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 66px;
      padding: 10px 14px;
    }

    &__identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;

      > div:last-child {
        min-width: 0;
      }

      p {
        margin: 4px 0 0;
        overflow: hidden;
        color: var(--text-secondary-color);
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);

      svg,
      img {
        width: 20px;
        height: 20px;
      }

      img {
        object-fit: contain;
      }
    }

    &__icon-image {
      border: 1px solid var(--border-color);
      background-color: var(--bg-primary-color);
    }

    &__name {
      display: flex;
      align-items: center;
      gap: 6px;

      strong {
        overflow: hidden;
        color: var(--text-color);
        font-size: 12px;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      span {
        flex-shrink: 0;
        color: var(--text-secondary-color);
        font-size: 9px;
      }
    }

    &__local {
      padding: 1px 5px;
      border-radius: 4px;
      color: var(--primary-color) !important;
      background-color: color-mix(in srgb, var(--primary-color) 9%, transparent);
    }

    &__actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__action-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 0;

      :deep(.n-switch) {
        margin: 0;
      }

      :deep(.n-popover__trigger) {
        display: inline-flex;
        line-height: 0;
      }

      &--disabled {
        pointer-events: none;
      }
    }

    // icon 贴齐按钮边界，避免内部留白把两个按钮视觉间距撑大
    &__icon-btn {
      :deep(svg) {
        width: 100%;
        height: 100%;
      }
    }

    &__divider {
      position: absolute;
      right: 14px;
      bottom: 0;
      left: 60px;
      height: 1px;
      background-color: var(--divider-color);
    }

    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 38px 24px;
      text-align: center;

      svg {
        width: 36px;
        height: 36px;
        color: var(--text-secondary-color);
        opacity: 0.55;
      }

      strong {
        margin-top: 12px;
        color: var(--text-color);
        font-size: 12px;
        font-weight: 500;
      }

      p {
        margin: 5px 0 0;
        color: var(--text-secondary-color);
        font-size: 10px;
      }
    }
  }
</style>
