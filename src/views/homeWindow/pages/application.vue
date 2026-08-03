<template>
  <div class="application-center">
    <header class="application-center__header">
      <div class="application-center__heading">
        <h1>{{ t('application.title') }}</h1>
        <p>{{ t('application.subtitle') }}</p>
      </div>

      <div class="application-center__header-actions">
        <n-button v-if="activeView === 'development'" size="small" @click="onLoadLocalPackage">
          <template #icon>
            <svg class="size-15px"><use href="#download" /></svg>
          </template>
          {{ t('application.development.installPackage') }}
        </n-button>
        <n-button v-if="activeView === 'development'" size="small" @click="onLoadDevelopmentPlugin">
          <template #icon>
            <svg class="size-15px"><use href="#folder" /></svg>
          </template>
          {{ t('application.development.loadFolder') }}
        </n-button>
        <n-input
          v-model:value="searchKeyword"
          size="small"
          class="application-center__search"
          :placeholder="t('application.searchPlaceholder')"
          clearable>
          <template #prefix>
            <svg class="size-16px text-[var(--text-secondary-color)]"><use href="#search" /></svg>
          </template>
        </n-input>
      </div>
    </header>

    <nav class="application-center__navigation" :aria-label="t('application.navigationLabel')">
      <button
        v-for="view in views"
        :key="view.value"
        type="button"
        class="application-center__navigation-item"
        :class="{ 'application-center__navigation-active': activeView === view.value }"
        @click="activeView = view.value">
        <svg><use :href="view.icon" /></svg>
        <span>{{ view.label }}</span>
        <span class="application-center__navigation-count">{{ view.count }}</span>
      </button>
    </nav>

    <section class="application-center__content">
      <div class="application-center__section-header">
        <div>
          <h2>{{ currentViewTitle }}</h2>
          <p>{{ currentViewDescription }}</p>
        </div>
        <span>{{ t('application.count', { count: visibleItems.length }) }}</span>
      </div>

      <div v-if="activeView === 'development'" class="application-center__development-banner">
        <div>
          <strong>{{ t('application.development.title') }}</strong>
          <p>{{ t('application.development.description') }}</p>
        </div>
        <n-switch
          :value="pluginStore.developerMode"
          @update:value="pluginStore.setDeveloperMode"
          :aria-label="t('application.development.title')" />
      </div>

      <n-scrollbar class="application-center__scroll">
        <div v-if="loading && activeView === 'market'" class="application-center__loading">
          <n-spin size="small" />
          <span>{{ t('application.loading') }}</span>
        </div>

        <div v-else-if="visibleItems.length > 0" class="application-center__grid">
          <PluginCard
            v-for="item in visibleItems"
            :key="item.id"
            :item="item"
            @select="onSelectPlugin"
            @install="onRequestInstall"
            @reload="onReloadPlugin"
            @export="onExportPlugin"
            @open="onOpenPlugin"
            @uninstall="onUninstallPlugin"
            @update="onUpdatePlugin"
            @toggle="onTogglePlugin" />
        </div>

        <div v-else class="application-center__empty">
          <svg><use :href="activeView === 'development' ? '#code' : '#application'" /></svg>
          <strong>{{ emptyTitle }}</strong>
          <p>{{ emptyDescription }}</p>
          <n-button
            v-if="activeView === 'development' && pluginStore.developerMode"
            size="small"
            @click="onLoadDevelopmentPlugin">
            {{ t('application.development.loadFolder') }}
          </n-button>
        </div>
      </n-scrollbar>
    </section>

    <PluginDetailDrawer
      v-model:show="showDetail"
      :item="selectedItem"
      @install="onRequestInstall"
      @export="onExportPlugin"
      @open="onOpenPlugin"
      @uninstall="onUninstallPlugin"
      @toggle="onTogglePlugin" />

    <n-modal
      v-model:show="showPermissionModal"
      class="application-center__modal"
      preset="card"
      :style="pluginModalStyle"
      :closable="false"
      :mask-closable="false">
      <template #header>{{ t('application.install.title') }}</template>
      <div class="application-center__permission-scroll" :style="pluginModalScrollStyle">
        <div v-if="pendingInstall" class="application-center__permission-content">
          <p>{{ t('application.install.description', { name: pendingInstall.name }) }}</p>
          <div
            v-for="permission in pendingInstall.permissions"
            :key="permission.name"
            class="application-center__permission-item">
            <svg><use href="#check" /></svg>
            <div>
              <strong>{{ permissionTitle(permission.name) }}</strong>
              <span>{{ permissionDescription(permission.name) }}</span>
              <code v-if="permission.scope">{{ formatPermissionScope(permission.scope) }}</code>
            </div>
          </div>
          <div v-if="pendingInstall.windows?.length" class="application-center__window-summary">
            <strong>{{ t('application.install.windowBehavior') }}</strong>
            <span>
              {{
                t('application.install.windowSummary', {
                  count: pendingInstall.windows.length,
                  width: pendingInstall.windows.find((window) => window.primary)?.size.width || 900,
                  height: pendingInstall.windows.find((window) => window.primary)?.size.height || 650
                })
              }}
            </span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="application-center__permission-actions">
          <n-button size="small" :disabled="committing" @click="onCancelInstall">
            {{ t('application.install.cancel') }}
          </n-button>
          <n-button size="small" :loading="committing" @click="onConfirmInstall">
            {{ t('application.install.confirm') }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showRemovalModal"
      class="application-center__modal"
      preset="card"
      :style="pluginModalStyle"
      :closable="!removing"
      :mask-closable="!removing">
      <template #header>{{ t('application.removal.title') }}</template>
      <div class="application-center__permission-scroll" :style="pluginModalScrollStyle">
        <div v-if="removalTarget" class="application-center__permission-content">
          <p>{{ t('application.removal.description', { name: removalTarget.name }) }}</p>
          <n-checkbox v-model:checked="deletePluginData" :disabled="removing">
            {{ t('application.removal.deleteData') }}
          </n-checkbox>
          <small>{{ t('application.removal.dataHint') }}</small>
        </div>
      </div>
      <template #footer>
        <div class="application-center__permission-actions">
          <n-button size="small" :disabled="removing" @click="showRemovalModal = false">
            {{ t('application.removal.cancel') }}
          </n-button>
          <n-button size="small" type="error" :loading="removing" @click="onConfirmUninstall">
            {{ t('application.removal.confirm') }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'application' })
  import { open, save } from '@tauri-apps/plugin-dialog'
  import type { CSSProperties } from 'vue'
  import { applicationApi } from '@/api'
  import PluginCard from '@/components/Application/PluginCard.vue'
  import PluginDetailDrawer from '@/components/Application/PluginDetailDrawer.vue'
  import * as pluginService from '@/services/pluginService'
  import { usePluginStore } from '@/stores/app/plugin'
  import { useUserStore } from '@/stores/user/user'
  import type { Application } from '@/types/api/application'
  import type { PluginCardModel, PluginCenterView, PreparedPlugin } from '@/types/plugin'
  import { createPluginRuntimeWindow, createPluginUiWindow } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const pluginStore = usePluginStore()
  const userStore = useUserStore()
  const activeView = ref<PluginCenterView>('market')
  const searchKeyword = ref('')
  const applicationList = ref<Application[]>([])
  const loading = ref(false)
  const selectedId = ref('')
  const showDetail = ref(false)
  const showPermissionModal = ref(false)
  const pendingInstall = ref<PluginCardModel | null>(null)
  const pendingPrepared = ref<PreparedPlugin | null>(null)
  const removalTarget = ref<PluginCardModel | null>(null)
  const preparingId = ref('')
  const committing = ref(false)
  const exportingId = ref('')
  const reloadingId = ref('')
  const removing = ref(false)
  const showRemovalModal = ref(false)
  const deletePluginData = ref(false)
  const pluginModalStyle = {
    width: 'min(520px, calc(100vw - 48px))',
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'calc(100vh - 48px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    color: 'var(--text-color)',
    backgroundColor: 'var(--bg-primary-color)',
    '--n-color': 'var(--bg-primary-color)',
    '--n-color-modal': 'var(--bg-primary-color)',
    '--n-text-color': 'var(--text-color)',
    '--n-title-text-color': 'var(--text-color)',
    '--n-border-color': 'var(--border-color)'
  } as CSSProperties

  const pluginModalScrollStyle = {
    maxHeight: 'calc(100vh - 200px)',
    overflowX: 'hidden',
    overflowY: 'auto'
  } as CSSProperties

  const displayDevelopmentPath = (path?: string) => {
    if (!path) return path
    if (path.startsWith('\\\\?\\UNC\\')) return `\\\\${path.slice(8)}`
    if (path.startsWith('\\\\?\\')) return path.slice(4)
    return path
  }

  const installedApplicationMap = computed(
    () => new Map(pluginStore.installedPlugins.map((item) => [item.applicationId || item.id, item]))
  )
  const marketApplicationMap = computed(() => new Map(applicationList.value.map((item) => [item.id, item])))

  const isNewerVersion = (candidate: string, current: string) => {
    const [candidateCore, candidatePre] = candidate.split('-', 2)
    const [currentCore, currentPre] = current.split('-', 2)
    const candidateParts = candidateCore.split('.').map(Number)
    const currentParts = currentCore.split('.').map(Number)
    for (let index = 0; index < Math.max(candidateParts.length, currentParts.length); index += 1) {
      const difference = (candidateParts[index] || 0) - (currentParts[index] || 0)
      if (difference !== 0) return difference > 0
    }
    if (!candidatePre && currentPre) return true
    if (candidatePre && !currentPre) return false
    return Boolean(
      candidatePre && currentPre && candidatePre.localeCompare(currentPre, undefined, { numeric: true }) > 0
    )
  }

  const marketItems = computed<PluginCardModel[]>(() =>
    applicationList.value.map((application) => {
      const installed = installedApplicationMap.value.get(application.id)
      const updateAvailable = Boolean(installed && isNewerVersion(application.version, installed.version))
      return {
        id: installed?.id || application.id,
        name: application.appName,
        version: installed?.version || application.version,
        latestVersion: application.version,
        description: application.description,
        author: application.author,
        iconUrl: application.iconUrl,
        tags: application.tags,
        source: 'official',
        status: !installed
          ? 'available'
          : updateAvailable
            ? 'update-available'
            : installed.enabled
              ? 'installed'
              : 'disabled',
        enabled: installed?.enabled ?? false,
        busy:
          preparingId.value === application.id || pluginStore.operationIds.includes(installed?.id || application.id),
        score: application.score,
        getCount: application.getCount,
        installedAt: installed?.installedAt,
        permissions: installed?.grantedPermissions || [],
        apiVersion: installed?.manifest.apiVersion || 1,
        windows: installed?.manifest.windows || [],
        application
      }
    })
  )

  const installedItems = computed<PluginCardModel[]>(() =>
    pluginStore.installedPlugins
      .filter((plugin) => plugin.source !== 'development')
      .map((plugin) => {
        const application = plugin.applicationId ? marketApplicationMap.value.get(plugin.applicationId) : undefined
        const latestVersion = application?.version || plugin.version
        return {
          id: plugin.id,
          name: plugin.name,
          version: plugin.version,
          latestVersion,
          description: plugin.description,
          author: plugin.author,
          iconUrl: plugin.iconUrl,
          tags: plugin.tags,
          source: plugin.source === 'community' ? 'community' : plugin.source === 'local' ? 'local' : 'official',
          status: isNewerVersion(latestVersion, plugin.version)
            ? 'update-available'
            : plugin.enabled
              ? 'installed'
              : 'disabled',
          enabled: plugin.enabled,
          busy: pluginStore.operationIds.includes(plugin.id) || preparingId.value === (application?.id || plugin.id),
          installedAt: plugin.installedAt,
          permissions: plugin.grantedPermissions,
          apiVersion: plugin.manifest.apiVersion || 1,
          windows: plugin.manifest.windows || [],
          application
        }
      })
  )

  const developmentItems = computed<PluginCardModel[]>(() =>
    pluginStore.installedPlugins
      .filter((plugin) => plugin.source === 'development')
      .map((plugin) => ({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        latestVersion: plugin.version,
        description: plugin.description || t('application.development.itemDescription'),
        author: plugin.author || t('application.development.localAuthor'),
        iconUrl: plugin.iconUrl,
        tags: plugin.tags,
        source: 'local',
        status: 'development',
        enabled: plugin.enabled,
        busy:
          pluginStore.operationIds.includes(plugin.id) ||
          exportingId.value === plugin.id ||
          reloadingId.value === plugin.id,
        reloading: reloadingId.value === plugin.id,
        exporting: exportingId.value === plugin.id,
        installedAt: plugin.installedAt,
        developmentPath: displayDevelopmentPath(plugin.developmentPath),
        permissions: plugin.grantedPermissions,
        apiVersion: plugin.manifest.apiVersion || 1,
        windows: plugin.manifest.windows || []
      }))
  )

  const currentItems = computed(() => {
    if (activeView.value === 'installed') return installedItems.value
    if (activeView.value === 'development') return developmentItems.value
    return marketItems.value
  })

  const visibleItems = computed(() => {
    const keyword = searchKeyword.value.trim().toLocaleLowerCase()
    if (!keyword) return currentItems.value
    return currentItems.value.filter((item) => {
      const searchable = [item.name, item.description, item.author, ...item.tags].join(' ').toLocaleLowerCase()
      return searchable.includes(keyword)
    })
  })

  const views = computed(() => [
    {
      value: 'market' as const,
      label: t('application.views.market.title'),
      icon: '#application',
      count: marketItems.value.length
    },
    {
      value: 'installed' as const,
      label: t('application.views.installed.title'),
      icon: '#check',
      count: installedItems.value.length
    },
    {
      value: 'development' as const,
      label: t('application.views.development.title'),
      icon: '#code',
      count: developmentItems.value.length
    }
  ])

  const currentViewTitle = computed(() => t(`application.views.${activeView.value}.title`))
  const currentViewDescription = computed(() => t(`application.views.${activeView.value}.description`))
  const emptyTitle = computed(() => t(`application.views.${activeView.value}.emptyTitle`))
  const emptyDescription = computed(() => t(`application.views.${activeView.value}.emptyDescription`))
  const selectedItem = computed(() => currentItems.value.find((item) => item.id === selectedId.value) || null)

  const fetchApplicationList = () => {
    loading.value = true
    applicationApi.list({ keyword: '' }).then((res) => {
      loading.value = false
      if (res.code === 0 && res.data) {
        applicationList.value = res.data
        return
      }
      window.$message.error(res.msg)
    })
  }

  const onSelectPlugin = (item: PluginCardModel) => {
    selectedId.value = item.id
    showDetail.value = true
  }

  const formatPluginError = (error: unknown) => {
    const raw = String(error)
    const code = raw.match(/PLUGIN_[A-Z0-9_]+/)?.[0]
    if (!code) return raw
    const key = `application.errors.${code}`
    const message = t(key)
    return message === key ? raw : message
  }

  const toPendingCard = (prepared: PreparedPlugin, application?: Application): PluginCardModel => ({
    id: prepared.manifest.id,
    name: prepared.manifest.name,
    version: prepared.manifest.version,
    latestVersion: prepared.manifest.version,
    description: prepared.manifest.description,
    author: prepared.manifest.publisher,
    iconUrl: application?.iconUrl || '',
    tags: application?.tags || [],
    source: prepared.source === 'official' ? 'official' : 'local',
    status: prepared.source === 'development' ? 'development' : 'available',
    enabled: false,
    developmentPath: prepared.source === 'development' ? t('application.development.pendingPath') : undefined,
    permissions: prepared.manifest.permissions,
    apiVersion: prepared.manifest.apiVersion || 1,
    windows: prepared.manifest.windows || [],
    application
  })

  const showPreparedInstall = (prepared: PreparedPlugin, application?: Application) => {
    pendingPrepared.value = prepared
    pendingInstall.value = toPendingCard(prepared, application)
    showDetail.value = false
    showPermissionModal.value = true
  }

  const onRequestInstall = (item: PluginCardModel) => {
    const application = item.application
    if (!application?.pluginUrl) {
      window.$message.error(t('application.errors.PLUGIN_URL_MISSING'))
      return
    }
    preparingId.value = application.id
    pluginService
      .prepareRemote(application, userStore.authInfo.token)
      .then((prepared) => showPreparedInstall(prepared, application))
      .catch((error) => window.$message.error(formatPluginError(error)))
      .finally(() => {
        preparingId.value = ''
      })
  }

  const onConfirmInstall = () => {
    const prepared = pendingPrepared.value
    const item = pendingInstall.value
    if (!prepared || !item) return
    committing.value = true
    pluginStore
      .commitInstall(prepared.transactionId, prepared.manifest.permissions)
      .then(() => {
        showPermissionModal.value = false
        window.$message.success(t('application.messages.installed', { name: item.name }))
        pendingPrepared.value = null
        pendingInstall.value = null
      })
      .catch((error) => window.$message.error(formatPluginError(error)))
      .finally(() => {
        committing.value = false
      })
  }

  const onCancelInstall = () => {
    const transactionId = pendingPrepared.value?.transactionId
    showPermissionModal.value = false
    pendingPrepared.value = null
    pendingInstall.value = null
    if (transactionId) {
      pluginService.abortInstall(transactionId).catch(() => undefined)
    }
  }

  const onOpenPlugin = (item: PluginCardModel) => {
    const plugin = pluginStore.installedPlugins.find((installed) => installed.id === item.id)
    if (!plugin) return
    createPluginUiWindow(plugin).catch((error) => {
      window.$message.error(error instanceof Error ? error.message : String(error))
    })
  }

  const normalizePermissions = (permissions: PluginCardModel['permissions']) =>
    permissions.map((permission) => JSON.stringify({ name: permission.name, scope: permission.scope ?? null })).sort()

  const onReloadPlugin = (item: PluginCardModel) => {
    if (!item.developmentPath) return
    const installed = pluginStore.installedPlugins.find((plugin) => plugin.id === item.id)
    reloadingId.value = item.id
    pluginService
      .prepareDevelopment(item.developmentPath)
      .then((prepared) => {
        const currentPermissions = normalizePermissions(installed?.grantedPermissions || [])
        const nextPermissions = normalizePermissions(prepared.manifest.permissions)
        if (JSON.stringify(currentPermissions) !== JSON.stringify(nextPermissions)) {
          showPreparedInstall(prepared)
          return undefined
        }
        return pluginStore.commitInstall(prepared.transactionId, installed?.grantedPermissions || []).then(() => {
          window.$message.success(t('application.messages.reloaded', { name: item.name }))
        })
      })
      .catch((error) => window.$message.error(formatPluginError(error)))
      .finally(() => {
        reloadingId.value = ''
      })
  }

  const onExportPlugin = (item: PluginCardModel) => {
    save({
      title: t('application.development.exportTitle'),
      defaultPath: `${item.id}-${item.version}.lyp`,
      filters: [{ name: t('application.development.packageFilter'), extensions: ['lyp'] }]
    })
      .then((destination) => {
        if (!destination) return
        exportingId.value = item.id
        pluginService
          .exportDevelopment(item.id, destination)
          .then((path) => window.$message.success(t('application.messages.exported', { path })))
          .catch((error) => window.$message.error(formatPluginError(error)))
          .finally(() => {
            exportingId.value = ''
          })
      })
      .catch((error) => window.$message.error(formatPluginError(error)))
  }

  const onUninstallPlugin = (item: PluginCardModel) => {
    removalTarget.value = item
    deletePluginData.value = false
    showRemovalModal.value = true
  }

  const onConfirmUninstall = () => {
    const item = removalTarget.value
    if (!item) return
    removing.value = true
    pluginStore
      .uninstallPlugin(item.id, deletePluginData.value)
      .then(() => {
        const message =
          item.status === 'development' ? 'application.messages.unloaded' : 'application.messages.uninstalled'
        window.$message.success(t(message, { name: item.name }))
        showDetail.value = false
        showRemovalModal.value = false
        removalTarget.value = null
      })
      .catch((error) => window.$message.error(formatPluginError(error)))
      .finally(() => {
        removing.value = false
      })
  }

  const onUpdatePlugin = (item: PluginCardModel) => {
    const record = pluginStore.installedPlugins.find((plugin) => plugin.id === item.id)
    const application = record?.applicationId ? marketApplicationMap.value.get(record.applicationId) : item.application
    if (!application) {
      window.$message.error(t('application.errors.PLUGIN_UPDATE_METADATA_MISSING'))
      return
    }
    onRequestInstall({ ...item, application })
  }

  const onTogglePlugin = (item: PluginCardModel, enabled: boolean) => {
    pluginStore.setPluginEnabled(item.id, enabled).catch((error) => window.$message.error(formatPluginError(error)))
  }

  const onLoadDevelopmentPlugin = () => {
    if (!pluginStore.developerMode) {
      window.$message.info(t('application.development.enableFirst'))
      return
    }
    open({ directory: true, multiple: false, title: t('application.development.selectFolder') }).then((selected) => {
      if (typeof selected !== 'string') return
      pluginService
        .prepareDevelopment(selected)
        .then((prepared) => showPreparedInstall(prepared))
        .catch((error) => window.$message.error(formatPluginError(error)))
    })
  }

  const onLoadLocalPackage = () => {
    if (!pluginStore.developerMode) {
      window.$message.info(t('application.development.enableFirst'))
      return
    }
    open({
      directory: false,
      multiple: false,
      title: t('application.development.selectPackage'),
      filters: [{ name: t('application.development.packageFilter'), extensions: ['lyp', 'zip'] }]
    }).then((selected) => {
      if (typeof selected !== 'string') return
      pluginService
        .prepareLocal(selected)
        .then((prepared) => showPreparedInstall(prepared))
        .catch((error) => window.$message.error(formatPluginError(error)))
    })
  }

  const permissionTitle = (name: string) => {
    const key = `application.permissions.${name.replace(/\./g, '_')}.title`
    const value = t(key)
    return value === key ? name : value
  }

  const permissionDescription = (name: string) => {
    const key = `application.permissions.${name.replace(/\./g, '_')}.description`
    const value = t(key)
    return value === key ? t('application.permissions.defaultDescription') : value
  }

  const formatPermissionScope = (scope: unknown) => {
    if (typeof scope === 'string') return scope
    try {
      return JSON.stringify(scope)
    } catch {
      return ''
    }
  }

  onMounted(() => {
    fetchApplicationList()
    pluginStore.refresh().catch((error) => window.$message.error(formatPluginError(error)))
    createPluginRuntimeWindow().catch((error) => console.error('[plugin-runtime] window creation failed', error))
  })

  onActivated(() => {
    fetchApplicationList()
    pluginStore.refresh().catch((error) => window.$message.error(formatPluginError(error)))
  })
</script>

<style scoped lang="scss">
  .application-center {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    color: var(--text-color);
    background-color: var(--bg-secondary-color);

    &__header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 20px 24px 16px;
    }

    &__heading {
      min-width: 0;

      h1 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
      }

      p {
        margin: 5px 0 0;
        color: var(--text-secondary-color);
        font-size: 12px;
      }
    }

    &__header-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__search {
      width: 230px;
    }

    &__navigation {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 24px 12px;
      border-bottom: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
    }

    &__navigation-item {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 11px;
      border: none;
      border-radius: 7px;
      color: var(--text-secondary-color);
      background: transparent;
      font-size: 12px;
      cursor: pointer;

      svg {
        width: 15px;
        height: 15px;
      }

      &:hover {
        color: var(--text-color);
        background-color: var(--button-soft-bg);
      }
    }

    &__navigation-active {
      color: var(--primary-color);
      background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);

      &:hover {
        color: var(--primary-color);
        background-color: color-mix(in srgb, var(--primary-color) 13%, transparent);
      }
    }

    &__navigation-count {
      min-width: 16px;
      padding: 1px 4px;
      border-radius: 999px;
      text-align: center;
      background-color: color-mix(in srgb, var(--border-color) 50%, transparent);
      font-size: 9px;
    }

    &__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 16px 24px 0;
    }

    &__section-header {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;

      h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }

      p,
      > span {
        margin: 4px 0 0;
        color: var(--text-secondary-color);
        font-size: 11px;
      }
    }

    &__development-banner {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
      padding: 12px 14px;
      border: 1px solid color-mix(in srgb, var(--primary-color) 30%, var(--border-color));
      border-radius: 9px;
      background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-primary-color));

      strong {
        font-size: 12px;
      }

      p {
        margin: 3px 0 0;
        color: var(--text-secondary-color);
        font-size: 11px;
      }
    }

    &__scroll {
      flex: 1;
      min-height: 0;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 2px 4px 24px 0;
    }

    &__loading,
    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 260px;
      color: var(--text-secondary-color);
      font-size: 12px;
    }

    &__loading {
      gap: 10px;
    }

    &__empty {
      gap: 8px;

      svg {
        width: 42px;
        height: 42px;
        margin-bottom: 4px;
        opacity: 0.35;
      }

      strong {
        color: var(--text-color);
        font-size: 13px;
        font-weight: 500;
      }

      p {
        max-width: 360px;
        margin: 0 0 6px;
        text-align: center;
        line-height: 1.6;
      }
    }

    &__permission-scroll {
      max-height: calc(100vh - 200px);
      overflow-x: hidden;
      overflow-y: auto;
    }

    &__permission-content {
      display: flex;
      flex-direction: column;
      gap: 2px;

      > p {
        margin: 0 0 6px;
        color: var(--text-secondary-color);
        font-size: 12px;
        line-height: 1.6;
      }

      > small {
        display: block;
        margin-top: 4px;
        color: var(--text-secondary-color);
        font-size: 10px;
        line-height: 1.5;
      }
    }

    &__permission-item {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 11px;
      border-radius: 8px;
      background-color: var(--bg-secondary-color);

      svg {
        flex-shrink: 0;
        width: 15px;
        height: 15px;
        margin-top: 2px;
        color: var(--primary-color);
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      strong {
        font-size: 12px;
      }

      span {
        color: var(--text-secondary-color);
        font-size: 11px;
      }

      code {
        display: block;
        margin-top: 5px;
        overflow-wrap: anywhere;
        color: var(--primary-color);
        font-size: 10px;
      }
    }

    &__permission-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    &__window-summary {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 11px;
      border-radius: 8px;
      background-color: var(--bg-secondary-color);

      strong {
        font-size: 12px;
      }

      span {
        color: var(--text-secondary-color);
        font-size: 11px;
      }
    }
  }

  @media (min-width: 1200px) {
    .application-center__grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .application-center {
      &__header {
        align-items: stretch;
        flex-direction: column;
      }

      &__header-actions,
      &__search {
        width: 100%;
      }

      &__grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }
</style>
