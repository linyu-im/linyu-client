import { invoke } from '@tauri-apps/api/core'
import { getPlugin, pluginKvDelete, pluginKvGet, pluginKvKeys, pluginKvSet } from '@/db/plugin'
import type { InstalledPlugin } from '@/types/plugin'

interface PluginApiRequest {
  pluginId: string
  method: string
  params: unknown
  record: {
    id: string
    enabled: boolean
    rootPath: string
    manifest: InstalledPlugin['manifest']
    grantedPermissions: InstalledPlugin['grantedPermissions']
  }
}

const toRuntimeRecord = (plugin: InstalledPlugin) => ({
  id: plugin.id,
  enabled: plugin.enabled,
  rootPath: plugin.rootPath,
  manifest: plugin.manifest,
  grantedPermissions: plugin.grantedPermissions
})

const validateStorageKey = (key: string) => {
  if (!key || key.length > 128 || !/^[a-zA-Z0-9._:-]+$/.test(key)) {
    throw new Error('PLUGIN_STORAGE_KEY_INVALID')
  }
}

const requirePermission = (permissions: { name: string }[], name: string) => {
  if (!permissions.some((permission) => permission.name === name)) {
    throw new Error(`PLUGIN_PERMISSION_DENIED:${name}`)
  }
}

export function invokePluginApi<T = unknown>(pluginId: string, userId: string, method: string, params: unknown = {}) {
  return getPlugin(pluginId).then(async (plugin) => {
    if (!plugin) throw new Error('PLUGIN_NOT_INSTALLED')
    if (!plugin.enabled) throw new Error('PLUGIN_DISABLED')

    const safeUserId = userId || 'anonymous'
    if (!/^[a-zA-Z0-9._:-]{1,64}$/.test(safeUserId)) {
      throw new Error('PLUGIN_USER_ID_INVALID')
    }

    if (method.startsWith('storage.')) {
      requirePermission(plugin.grantedPermissions, 'storage')
      if (method === 'storage.keys') return (await pluginKvKeys(pluginId, safeUserId)) as T
      const key = (params as { key?: string })?.key
      if (!key) throw new Error('PLUGIN_API_PARAM_MISSING:key')
      validateStorageKey(key)
      if (method === 'storage.get') return (await pluginKvGet(pluginId, safeUserId, key)) as T
      if (method === 'storage.set') {
        await pluginKvSet(pluginId, safeUserId, key, (params as { value?: unknown })?.value ?? null)
        return null as T
      }
      if (method === 'storage.delete') {
        await pluginKvDelete(pluginId, safeUserId, key)
        return null as T
      }
    }

    const request: PluginApiRequest = {
      pluginId,
      method,
      params,
      record: toRuntimeRecord(plugin)
    }
    return invoke<T>('plugin_invoke_api', { request })
  })
}
