<template>
  <div class="plugin-ui-window">
    <ToolBar
      v-if="declaredWindow?.decorations.mode === 'linyu'"
      class="plugin-ui-window__toolbar"
      @maximized="(is) => (isMaximized = is)">
      <div class="plugin-ui-window__title" :class="{ 'plugin-ui-window__title--tab': declaredWindow.decorations.tabs }">
        <div v-if="plugin?.iconUrl" class="plugin-ui-window__icon">
          <img :src="plugin.iconUrl" alt="" />
        </div>
        <div class="plugin-ui-window__name">
          {{ declaredWindow?.title || plugin?.name || t('pluginUi.unknownPlugin') }}
        </div>
        <div v-if="plugin && declaredWindow?.decorations.showVersion" class="plugin-ui-window__version">
          v{{ plugin.version }}
        </div>
      </div>
      <div class="plugin-ui-window__window-actions">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((value) => (isMaximized = !value))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <main class="plugin-ui-window__content">
      <iframe
        v-if="status === 'ready'"
        ref="frameRef"
        class="plugin-ui-window__frame"
        :title="plugin?.name || t('pluginUi.unknownPlugin')"
        :srcdoc="pluginDocument"
        sandbox="allow-scripts allow-forms allow-modals"
        referrerpolicy="no-referrer"
        @load="onFrameLoaded" />

      <div v-else class="plugin-ui-window__state">
        <n-spin v-if="status === 'loading'" size="small" />
        <div v-else class="plugin-ui-window__state-icon">
          <svg><use :href="status === 'not-found' ? '#info' : '#code'" /></svg>
        </div>
        <h1>{{ stateTitle }}</h1>
        <p>{{ stateDescription }}</p>
        <n-button v-if="status === 'error'" size="small" secondary @click="loadPluginUi">
          {{ t('pluginUi.retry') }}
        </n-button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { listen, type UnlistenFn } from '@tauri-apps/api/event'
  import { useI18n } from 'vue-i18n'
  import { useRoute } from 'vue-router'
  import { executePluginCommand } from '@/plugins/runtime/client'
  import {
    executePluginContextApi,
    getPluginAppearance,
    PLUGIN_APPEARANCE_EVENT,
    subscribePluginAppearance,
    type PluginAppearance
  } from '@/plugins/runtime/context'
  import {
    buildPluginUiDocument,
    type PluginUiEvent,
    type PluginUiRequest,
    type PluginUiResponse
  } from '@/plugins/ui/bridge'
  import * as pluginApiService from '@/services/pluginApiService'
  import * as pluginService from '@/services/pluginService'
  import { usePluginStore } from '@/stores/app/plugin'
  import { useUserStore } from '@/stores/user/user'
  import {
    closeCurrentWindow,
    createPluginUiWindow,
    getPluginWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    trackCurrentPluginWindowBounds,
    ShowCurrentWindow
  } from '@/utils/desktop/window'

  type PluginUiStatus = 'loading' | 'ready' | 'not-found' | 'no-ui' | 'error'

  const { t } = useI18n()
  const route = useRoute()
  const pluginStore = usePluginStore()
  const userStore = useUserStore()
  const isMaximized = ref(false)
  const frameRef = ref<HTMLIFrameElement | null>(null)
  const pluginDocument = ref('')
  const status = ref<PluginUiStatus>('loading')
  let unlistenLifecycle: UnlistenFn | undefined
  let stopAppearanceSubscription: (() => void) | undefined
  let stopBoundsTracking: (() => void) | undefined
  const pluginId = computed(() => (typeof route.query.pluginId === 'string' ? route.query.pluginId : ''))
  const windowId = computed(() => (typeof route.query.windowId === 'string' ? route.query.windowId : 'main'))
  const plugin = computed(() => pluginStore.installedPlugins.find((item) => item.id === pluginId.value) || null)
  const declaredWindow = computed(() => (plugin.value ? getPluginWindow(plugin.value, windowId.value) : null))
  const stateTitle = computed(() => {
    if (status.value === 'loading')
      return t('pluginUi.loadingTitle', { name: plugin.value?.name || t('pluginUi.unknownPlugin') })
    if (status.value === 'not-found') return t('pluginUi.notFoundTitle')
    if (status.value === 'no-ui') return t('pluginUi.noUiTitle')
    return t('pluginUi.errorTitle')
  })
  const stateDescription = computed(() => {
    if (status.value === 'loading') return t('pluginUi.loadingDescription')
    if (status.value === 'not-found') return t('pluginUi.notFoundDescription')
    if (status.value === 'no-ui') return t('pluginUi.noUiDescription')
    return t('pluginUi.errorDescription', { name: plugin.value?.name || t('pluginUi.unknownPlugin') })
  })

  const loadPluginUi = () => {
    status.value = 'loading'
    pluginStore
      .refresh()
      .then(() => {
        if (!plugin.value) {
          status.value = 'not-found'
          return null
        }
        if (!declaredWindow.value) {
          status.value = 'no-ui'
          return null
        }
        return pluginService.readEntry(plugin.value.id, 'ui', windowId.value)
      })
      .then((entry) => {
        if (!entry) return
        pluginDocument.value = buildPluginUiDocument(entry.content)
        status.value = 'ready'
      })
      .catch((error) => {
        console.error('[plugin-ui] failed to load', error)
        status.value = 'error'
      })
  }

  const sendFrameResponse = (response: PluginUiResponse) => {
    try {
      const safeResponse =
        response.result === undefined ? response : { ...response, result: JSON.parse(JSON.stringify(response.result)) }
      frameRef.value?.contentWindow?.postMessage(safeResponse, '*')
    } catch {
      frameRef.value?.contentWindow?.postMessage(
        {
          channel: 'linyu-client-ui',
          type: 'result',
          requestId: response.requestId,
          error: 'PLUGIN_API_RESULT_INVALID'
        } satisfies PluginUiResponse,
        '*'
      )
    }
  }

  const sendFrameEvent = (event: PluginUiEvent) => {
    frameRef.value?.contentWindow?.postMessage(event, '*')
  }

  const notifyAppearance = (appearance: PluginAppearance = getPluginAppearance()) => {
    sendFrameEvent({
      channel: 'linyu-client-ui',
      type: 'event',
      event: PLUGIN_APPEARANCE_EVENT,
      payload: appearance
    })
  }

  const onFrameLoaded = () => notifyAppearance()

  const onFrameMessage = (event: MessageEvent<PluginUiRequest>) => {
    if (event.source !== frameRef.value?.contentWindow) return
    const request = event.data
    if (!request || request.channel !== 'linyu-plugin-ui' || request.type !== 'invoke') return
    let payloadSize = 0
    try {
      payloadSize = JSON.stringify(request.params ?? null).length
    } catch {
      sendFrameResponse({
        channel: 'linyu-client-ui',
        type: 'result',
        requestId: request.requestId,
        error: 'PLUGIN_API_PAYLOAD_INVALID'
      })
      return
    }
    if (payloadSize > 1024 * 1024) {
      sendFrameResponse({
        channel: 'linyu-client-ui',
        type: 'result',
        requestId: request.requestId,
        error: 'PLUGIN_API_PAYLOAD_TOO_LARGE'
      })
      return
    }

    const contextExecution =
      request.method === 'commands.execute'
        ? executePluginCommand(
            pluginId.value,
            String((request.params as { command?: unknown })?.command || ''),
            (request.params as { args?: unknown })?.args
          )
        : request.method === 'windows.open'
          ? pluginApiService
              .invokePluginApi(pluginId.value, userStore.authInfo.userId, 'permissions.check', {
                name: 'window.open'
              })
              .then(() => {
                if (!plugin.value) throw new Error('PLUGIN_NOT_INSTALLED')
                const targetId = String((request.params as { windowId?: unknown })?.windowId || '')
                if (!targetId) throw new Error('PLUGIN_API_PARAM_MISSING:windowId')
                return createPluginUiWindow(plugin.value, targetId).then(() => null)
              })
          : executePluginContextApi(pluginId.value, request.method)
    const execution =
      contextExecution ??
      pluginApiService.invokePluginApi(pluginId.value, userStore.authInfo.userId, request.method, request.params)

    execution
      .then((result) => {
        sendFrameResponse({
          channel: 'linyu-client-ui',
          type: 'result',
          requestId: request.requestId,
          result
        })
      })
      .catch((error) => {
        sendFrameResponse({
          channel: 'linyu-client-ui',
          type: 'result',
          requestId: request.requestId,
          error: String(error)
        })
      })
  }

  onMounted(() => {
    window.addEventListener('message', onFrameMessage)
    stopAppearanceSubscription = subscribePluginAppearance(notifyAppearance)
    void listen<{ action: string; pluginId: string }>('plugin:lifecycle', (event) => {
      if (event.payload.pluginId !== pluginId.value) return
      if (event.payload.action === 'disable' || event.payload.action === 'uninstall') {
        void closeCurrentWindow()
      }
    }).then((unlisten) => {
      unlistenLifecycle = unlisten
    })
    loadPluginUi()
    if (declaredWindow.value?.behavior.persistBounds) {
      trackCurrentPluginWindowBounds(pluginId.value, windowId.value).then((unlisten) => {
        stopBoundsTracking = unlisten
      })
    }
    nextTick(() => ShowCurrentWindow())
  })

  onUnmounted(() => {
    unlistenLifecycle?.()
    stopAppearanceSubscription?.()
    stopBoundsTracking?.()
    window.removeEventListener('message', onFrameMessage)
  })
</script>

<style scoped lang="scss">
  .plugin-ui-window {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background-color: var(--bg-secondary-color);

    &__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      height: 38px;
      // 与主窗口 home__header 一致：右侧操作按钮留 3px
      padding: 0 3px 0 10px;
    }

    &__title {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      height: 100%;

      &--tab {
        align-self: flex-end;
        height: 32px;
        padding: 0 12px;
        border: 1px solid var(--border-color);
        border-bottom-color: var(--bg-primary-color);
        border-radius: 7px 7px 0 0;
        background-color: var(--bg-primary-color);
      }
    }

    &__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 600;
      line-height: 22px;
    }

    &__version {
      flex-shrink: 0;
      color: var(--text-secondary-color);
      font-size: 9px;
      font-weight: 400;
      line-height: 22px;
    }

    &__icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background-color: var(--bg-primary-color);

      img {
        width: 16px;
        height: 16px;
        object-fit: contain;
      }
    }

    &__window-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    &__content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: var(--bg-primary-color);
    }

    &__frame {
      width: 100%;
      height: 100%;
      border: none;
      background-color: var(--bg-primary-color);
    }

    &__state {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 420px;
      padding: 30px;
      text-align: center;

      h1 {
        margin: 16px 0 6px;
        font-size: 16px;
      }

      p {
        margin: 0 0 14px;
        color: var(--text-secondary-color);
        font-size: 12px;
        line-height: 1.6;
      }
    }

    &__state-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 13px;
      color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);

      svg {
        width: 24px;
        height: 24px;
      }
    }
  }
</style>
