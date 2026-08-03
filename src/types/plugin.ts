import type { Application } from '@/types/api/application'

export type PluginCenterView = 'market' | 'installed' | 'development'

export type PluginSource = 'official' | 'community' | 'local'

export type PluginRegistrySource = PluginSource | 'development'

export type PluginCardStatus = 'available' | 'installed' | 'disabled' | 'update-available' | 'development'

export interface PluginPermission {
  name: string
  scope?: unknown
}

export interface PluginEngine {
  linyu: string
}

export type PluginWindowDecorationMode = 'native' | 'linyu' | 'none'

export interface PluginWindowDecorations {
  mode: PluginWindowDecorationMode
  tabs: boolean
  showIcon: boolean
  showVersion: boolean
}

export interface PluginWindowSize {
  width: number
  height: number
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
}

export interface PluginWindowBehavior {
  resizable: boolean
  center: boolean
  singleton: boolean
  persistBounds: boolean
  alwaysOnTop: boolean
  skipTaskbar: boolean
  fullscreen: boolean
}

export interface PluginWindow {
  id: string
  entry: string
  primary: boolean
  title: string
  decorations: PluginWindowDecorations
  size: PluginWindowSize
  behavior: PluginWindowBehavior
}

export interface PluginContributions {
  commands: unknown[]
  views: unknown[]
  chatActions: unknown[]
  fileOpeners: unknown[]
  settings: unknown[]
}

export interface PluginManifest {
  manifestVersion: number
  apiVersion?: number
  id: string
  name: string
  version: string
  publisher: string
  description: string
  engines: PluginEngine
  main: string
  ui?: string
  windows?: PluginWindow[]
  icon?: string
  activationEvents: string[]
  contributes: PluginContributions
  permissions: PluginPermission[]
}

export interface InstalledPlugin {
  id: string
  applicationId?: string
  name: string
  version: string
  description: string
  author: string
  iconUrl: string
  tags: string[]
  source: PluginRegistrySource
  enabled: boolean
  installedAt: string
  updatedAt: string
  rootPath: string
  packageSha256: string
  signatureStatus: string
  developmentPath?: string
  manifest: PluginManifest
  grantedPermissions: PluginPermission[]
}

export interface PreparedPlugin {
  transactionId: string
  manifest: PluginManifest
  packageSha256: string
  signatureStatus: string
  source: PluginRegistrySource
}

export interface PluginSystemInfo {
  rootPath: string
  installedPath: string
  dataPath: string
  stagingPath: string
  registryPath: string
}

export interface PluginEntry {
  content: string
  path: string
  kind: 'worker' | 'ui' | 'icon'
}

export interface PluginFileHandle {
  id: string
  name: string
  kind: 'file' | 'directory'
}

export interface PluginFileStat {
  name: string
  size: number
  isFile: boolean
  isDirectory: boolean
  readonly: boolean
}

export interface PluginWindowSizeResult {
  width: number
  height: number
}

export interface PluginCardModel {
  id: string
  name: string
  version: string
  latestVersion: string
  description: string
  author: string
  iconUrl: string
  tags: string[]
  source: PluginSource
  status: PluginCardStatus
  enabled: boolean
  busy?: boolean
  reloading?: boolean
  exporting?: boolean
  score?: number
  getCount?: number
  installedAt?: string
  developmentPath?: string
  permissions: PluginPermission[]
  apiVersion?: number
  windows?: PluginWindow[]
  application?: Application
}

export interface PluginRuntimeRequest {
  requestId: string
  replyLabel: string
  pluginId: string
  command: string
  args?: unknown
}

export interface PluginRuntimeResponse {
  requestId: string
  result?: unknown
  error?: string
}
