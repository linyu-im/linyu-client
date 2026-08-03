<template>
  <div class="plugin-runtime-window">
    <svg><use href="#plug" /></svg>
    <strong>{{ t('pluginRuntime.title') }}</strong>
    <span>{{ t('pluginRuntime.activeCount', { count: activePluginCount }) }}</span>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'pluginRuntimeWindow' })
  import { PluginHost } from '@/plugins/runtime/host'
  import { usePluginStore } from '@/stores/app/plugin'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const pluginStore = usePluginStore()
  const pluginHost = new PluginHost()
  const activePluginCount = computed(() => pluginStore.installedPlugins.filter((item) => item.enabled).length)

  onMounted(() => {
    pluginStore.refresh().catch((error) => console.error('[plugin-runtime] registry load failed', error))
    pluginHost.initialize().catch((error) => console.error('[plugin-runtime] host initialization failed', error))
  })

  onUnmounted(() => {
    pluginHost.destroy()
  })
</script>

<style scoped lang="scss">
  .plugin-runtime-window {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100vw;
    height: 100vh;
    color: var(--text-secondary-color);
    background-color: var(--bg-secondary-color);
    font-size: 11px;

    svg {
      width: 24px;
      height: 24px;
      color: var(--primary-color);
    }

    strong {
      color: var(--text-color);
      font-size: 12px;
    }
  }
</style>
