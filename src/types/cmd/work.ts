export type WorkApprovalMode = 'ask' | 'auto' | 'yolo'
export type WorkMode = 'economy' | 'balanced' | 'delivery'
export type WorkScopeMode = 'chat' | 'workspace'

export interface WorkRuntime {
  id: string
  name: string
  description: string
  protocol: string
  installed: boolean
  version?: string
  executablePath?: string
  source: string
  installState: string
  supports: string[]
}

export interface WorkRuntimeUpdateInfo {
  currentVersion?: string
  latestVersion?: string
  updateAvailable: boolean
}

export interface WorkProvider {
  id: string
  name: string
  kind: 'openai' | 'anthropic'
  baseUrl: string
  models: string[]
  defaultModel: string
  apiKeyEnv: string
  hasApiKey: boolean
  enabled: boolean
}

export interface WorkProviderInput {
  id: string
  name: string
  kind: WorkProvider['kind']
  baseUrl: string
  models: string[]
  defaultModel: string
  apiKey?: string
  enabled: boolean
}

export interface WorkProviderTestResult {
  ok: boolean
  latencyMs: number
  models: string[]
  message: string
}

export interface WorkPreferences {
  activeRuntimeId: string
  activeProviderId?: string
  activeModel?: string
  approvalMode: WorkApprovalMode
  workMode: WorkMode
  providers: WorkProvider[]
  disabledSkills: string[]
}

export interface WorkPreferencesInput {
  activeRuntimeId: string
  activeProviderId?: string
  activeModel?: string
  approvalMode: WorkApprovalMode
  workMode: WorkMode
}

export interface WorkSkillLocalState {
  installedIds: string[]
  disabledIds: string[]
}

/** 市场技能视图：远程 Skill + 本地安装/启用态 */
export interface WorkSkill {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  featured: boolean
  capabilities: string[]
  content: string
  iconUrl: string
  createdAt: string
  updatedAt: string
  installed: boolean
  enabled: boolean
}

export interface WorkStatus {
  runtime: WorkRuntime
  provider?: WorkProvider
  model?: string
  approvalMode: WorkApprovalMode
  workMode: WorkMode
  activeSessions: number
  installedSkills: number
}

export interface WorkEvent {
  runtimeId: string
  kind:
    | 'session_update'
    | 'permission_request'
    | 'runtime_log'
    | 'runtime_stopped'
    | 'install_progress'
    | 'protocol_error'
  sessionId?: string
  requestId?: string
  payload: Record<string, unknown>
}

export interface WorkPermissionOption {
  optionId: string
  name: string
  kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always'
}

export interface WorkPermissionRequest {
  requestId: string
  title: string
  kind: string
  rawInput?: Record<string, unknown>
  options: WorkPermissionOption[]
}

export interface WorkSessionResult {
  sessionId: string
  [key: string]: unknown
}
