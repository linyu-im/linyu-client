import { getDb } from './connection'
import type { InstalledPlugin, PluginManifest, PluginPermission } from '@/types/plugin'

interface PluginInstallationRow {
  userId: string
  id: string
  applicationId: string | null
  name: string
  version: string
  description: string
  author: string
  iconUrl: string
  tagsJson: string
  source: string
  enabled: number
  installedAt: string
  updatedAt: string
  rootPath: string
  packageSha256: string
  signatureStatus: string
  developmentPath: string | null
  manifestJson: string
  grantsJson: string
}

const SELECT_FIELDS = `
  user_id AS userId,
  id,
  application_id AS applicationId,
  name,
  version,
  description,
  author,
  icon_url AS iconUrl,
  tags_json AS tagsJson,
  source,
  enabled,
  installed_at AS installedAt,
  updated_at AS updatedAt,
  root_path AS rootPath,
  package_sha256 AS packageSha256,
  signature_status AS signatureStatus,
  development_path AS developmentPath,
  manifest_json AS manifestJson,
  grants_json AS grantsJson
`

const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const rowToPlugin = (row: PluginInstallationRow): InstalledPlugin => ({
  userId: row.userId,
  id: row.id,
  applicationId: row.applicationId || undefined,
  name: row.name,
  version: row.version,
  description: row.description,
  author: row.author,
  iconUrl: row.iconUrl || '',
  tags: parseJson<string[]>(row.tagsJson, []),
  source: row.source as InstalledPlugin['source'],
  enabled: Boolean(row.enabled),
  installedAt: row.installedAt,
  updatedAt: row.updatedAt,
  rootPath: row.rootPath,
  packageSha256: row.packageSha256 || '',
  signatureStatus: row.signatureStatus || 'unverified',
  developmentPath: row.developmentPath || undefined,
  manifest: parseJson<PluginManifest>(row.manifestJson, {
    manifestVersion: 1,
    apiVersion: 1,
    id: row.id,
    name: row.name,
    version: row.version,
    publisher: row.author,
    description: row.description,
    engines: { linyu: '*' },
    main: '',
    activationEvents: [],
    contributes: {
      commands: [],
      views: [],
      chatActions: [],
      fileOpeners: [],
      settings: []
    },
    permissions: []
  }),
  grantedPermissions: parseJson<PluginPermission[]>(row.grantsJson, [])
})

export async function listPlugins(userId: string): Promise<InstalledPlugin[]> {
  const db = await getDb()
  const rows = await db.select<PluginInstallationRow[]>(
    `SELECT ${SELECT_FIELDS} FROM t_plugin_installation
     WHERE user_id = ?
     ORDER BY installed_at DESC`,
    [userId]
  )
  return rows.map(rowToPlugin)
}

export async function getPlugin(userId: string, pluginId: string): Promise<InstalledPlugin | null> {
  const db = await getDb()
  const rows = await db.select<PluginInstallationRow[]>(
    `SELECT ${SELECT_FIELDS} FROM t_plugin_installation
     WHERE user_id = ? AND id = ? LIMIT 1`,
    [userId, pluginId]
  )
  return rows[0] ? rowToPlugin(rows[0]) : null
}

export async function upsertPlugin(record: InstalledPlugin): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_plugin_installation (
      user_id, id, application_id, name, version, description, author, icon_url, tags_json,
      source, enabled, installed_at, updated_at, root_path, package_sha256,
      signature_status, development_path, manifest_json, grants_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, id) DO UPDATE SET
      application_id = excluded.application_id,
      name = excluded.name,
      version = excluded.version,
      description = excluded.description,
      author = excluded.author,
      icon_url = excluded.icon_url,
      tags_json = excluded.tags_json,
      source = excluded.source,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at,
      root_path = excluded.root_path,
      package_sha256 = excluded.package_sha256,
      signature_status = excluded.signature_status,
      development_path = excluded.development_path,
      manifest_json = excluded.manifest_json,
      grants_json = excluded.grants_json`,
    [
      record.userId,
      record.id,
      record.applicationId || null,
      record.name,
      record.version,
      record.description,
      record.author,
      record.iconUrl || '',
      JSON.stringify(record.tags || []),
      record.source,
      record.enabled ? 1 : 0,
      record.installedAt,
      record.updatedAt,
      record.rootPath,
      record.packageSha256 || '',
      record.signatureStatus || 'unverified',
      record.developmentPath || null,
      JSON.stringify(record.manifest),
      JSON.stringify(record.grantedPermissions || [])
    ]
  )
}

export async function setPluginEnabled(userId: string, pluginId: string, enabled: boolean): Promise<boolean> {
  const db = await getDb()
  const result = await db.execute(
    `UPDATE t_plugin_installation SET enabled = ?, updated_at = ?
     WHERE user_id = ? AND id = ?`,
    [enabled ? 1 : 0, String(Date.now()), userId, pluginId]
  )
  return (result.rowsAffected || 0) > 0
}

export async function removePlugin(userId: string, pluginId: string, deleteData: boolean): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_plugin_installation WHERE user_id = ? AND id = ?`, [userId, pluginId])
  if (deleteData) {
    await db.execute(`DELETE FROM t_plugin_kv WHERE plugin_id = ? AND user_id = ?`, [pluginId, userId])
  }
}

export async function pluginKvGet(pluginId: string, userId: string, key: string): Promise<unknown | null> {
  const db = await getDb()
  const rows = await db.select<{ valueJson: string }[]>(
    `SELECT value_json AS valueJson FROM t_plugin_kv
     WHERE plugin_id = ? AND user_id = ? AND key = ? LIMIT 1`,
    [pluginId, userId, key]
  )
  if (!rows[0]) return null
  return parseJson(rows[0].valueJson, null)
}

export async function pluginKvSet(pluginId: string, userId: string, key: string, value: unknown): Promise<void> {
  const valueJson = JSON.stringify(value ?? null)
  if (valueJson.length > 256 * 1024) {
    throw new Error('PLUGIN_STORAGE_VALUE_TOO_LARGE')
  }
  const db = await getDb()
  await db.execute(
    `INSERT INTO t_plugin_kv (plugin_id, user_id, key, value_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(plugin_id, user_id, key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
    [pluginId, userId, key, valueJson, String(Date.now())]
  )
}

export async function pluginKvDelete(pluginId: string, userId: string, key: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM t_plugin_kv WHERE plugin_id = ? AND user_id = ? AND key = ?`, [pluginId, userId, key])
}

export async function pluginKvKeys(pluginId: string, userId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ key: string }[]>(
    `SELECT key FROM t_plugin_kv WHERE plugin_id = ? AND user_id = ? ORDER BY key`,
    [pluginId, userId]
  )
  return rows.map((row) => row.key)
}
