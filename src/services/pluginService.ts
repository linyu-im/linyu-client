import { invoke } from '@tauri-apps/api/core'
import { getPlugin, listPlugins, removePlugin, setPluginEnabled, upsertPlugin } from '@/db/plugin'
import { useUserStore } from '@/stores/user/user'
import type { Application } from '@/types/api/application'
import type { InstalledPlugin, PluginEntry, PluginPermission, PluginSystemInfo, PreparedPlugin } from '@/types/plugin'
import { isApiOriginUrl, resolveResourceUrl } from '@/utils/network/http'

interface PrepareLocalInput {
  path: string
}

interface CommitInstallInput {
  transactionId: string
  grantedPermissions: PluginPermission[]
  previousInstalledAt?: string
}

interface UninstallInput {
  pluginId: string
  deleteData: boolean
  isDevelopment: boolean
}

interface SetEnabledInput {
  pluginId: string
  enabled: boolean
}

interface ReadEntryInput {
  pluginId: string
  kind: PluginEntry['kind']
  windowId?: string
  record: {
    id: string
    enabled: boolean
    rootPath: string
    manifest: InstalledPlugin['manifest']
    grantedPermissions: PluginPermission[]
  }
}

interface ExportDevelopmentInput {
  pluginId: string
  destinationPath: string
  rootPath: string
}

const resolveUserId = () => {
  const userStore = useUserStore()
  return userStore.userInfo.id || userStore.authInfo.userId || ''
}

const requireUserId = () => {
  const userId = resolveUserId()
  if (!userId) throw new Error('PLUGIN_USER_REQUIRED')
  return userId
}

export function getSystemInfo() {
  return invoke<PluginSystemInfo>('plugin_get_system_info')
}

export function list() {
  return listPlugins(requireUserId())
}

export function prepareRemote(application: Application, authorization: string) {
  const url = resolveResourceUrl(application.pluginUrl)
  return invoke<PreparedPlugin>('plugin_prepare_remote', {
    input: {
      url,
      authorization: isApiOriginUrl(url) ? authorization || null : null,
      expectedSha256: application.pluginSha256 || '',
      signature: application.pluginSignature || null,
      applicationId: application.id,
      iconUrl: application.iconUrl,
      tags: application.tags
    }
  })
}

export function prepareLocal(path: string) {
  const input: PrepareLocalInput = { path }
  return invoke<PreparedPlugin>('plugin_prepare_local', { input })
}

export function prepareDevelopment(path: string) {
  const input: PrepareLocalInput = { path }
  return invoke<PreparedPlugin>('plugin_prepare_development', { input })
}

export function exportDevelopment(pluginId: string, destinationPath: string) {
  const userId = requireUserId()
  return getPlugin(userId, pluginId).then((plugin) => {
    if (!plugin) throw new Error('PLUGIN_NOT_INSTALLED')
    if (plugin.source !== 'development') throw new Error('PLUGIN_EXPORT_DEVELOPMENT_ONLY')
    const input: ExportDevelopmentInput = {
      pluginId,
      destinationPath,
      rootPath: plugin.rootPath
    }
    return invoke<string>('plugin_export_development', { input })
  })
}

export function abortInstall(transactionId: string) {
  return invoke<void>('plugin_abort_install', { transactionId })
}

export function commitInstall(transactionId: string, grantedPermissions: PluginPermission[]) {
  const userId = requireUserId()
  return listPlugins(userId).then(async (existingPlugins) => {
    const record = await invoke<InstalledPlugin>('plugin_commit_install', {
      input: {
        transactionId,
        grantedPermissions
      } satisfies CommitInstallInput
    })
    record.userId = userId
    const previous = existingPlugins.find((item) => item.id === record.id)
    if (previous?.installedAt) {
      record.installedAt = previous.installedAt
    }
    await upsertPlugin(record)
    return record
  })
}

export function uninstall(pluginId: string, deleteData = false) {
  const userId = requireUserId()
  return getPlugin(userId, pluginId).then(async (plugin) => {
    if (!plugin) throw new Error('PLUGIN_NOT_INSTALLED')
    const input: UninstallInput = {
      pluginId,
      deleteData,
      isDevelopment: plugin.source === 'development'
    }
    await invoke<void>('plugin_uninstall', { input })
    await removePlugin(userId, pluginId, deleteData)
  })
}

export function setEnabled(pluginId: string, enabled: boolean) {
  const userId = requireUserId()
  return setPluginEnabled(userId, pluginId, enabled).then(async (updated) => {
    if (!updated) throw new Error('PLUGIN_NOT_INSTALLED')
    const input: SetEnabledInput = { pluginId, enabled }
    await invoke<void>('plugin_set_enabled', { input })
  })
}

export function readEntry(pluginId: string, kind: PluginEntry['kind'], windowId?: string) {
  const userId = requireUserId()
  return getPlugin(userId, pluginId).then((plugin) => {
    if (!plugin) throw new Error('PLUGIN_NOT_INSTALLED')
    const input: ReadEntryInput = {
      pluginId,
      kind,
      windowId,
      record: {
        id: plugin.id,
        enabled: plugin.enabled,
        rootPath: plugin.rootPath,
        manifest: plugin.manifest,
        grantedPermissions: plugin.grantedPermissions
      }
    }
    return invoke<PluginEntry>('plugin_read_entry', { input })
  })
}
