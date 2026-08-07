import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { skillApi } from '@/api'
import { WORK_EVENT } from '@/constants/event'
import type { Skill, SkillListParam } from '@/types/api/skill'
import type {
  WorkEvent,
  WorkPreferences,
  WorkPreferencesInput,
  WorkProvider,
  WorkProviderInput,
  WorkProviderTestResult,
  WorkRuntime,
  WorkRuntimeUpdateInfo,
  WorkScopeMode,
  WorkSessionResult,
  WorkSkill,
  WorkSkillLocalState,
  WorkStatus
} from '@/types/cmd/work'
import type { WorkAttachmentRecord } from '@/db/workAssistant'

export const listRuntimes = () => invoke<WorkRuntime[]>('work_runtime_list')
export const detectRuntime = () => invoke<WorkRuntime>('work_runtime_detect')
export const checkRuntimeUpdate = () => invoke<WorkRuntimeUpdateInfo>('work_runtime_check_update')
export const installRuntime = () => invoke<string>('work_runtime_install')

export const listProviders = () => invoke<WorkProvider[]>('work_provider_list')
export const saveProvider = (input: WorkProviderInput) => invoke<WorkProvider>('work_provider_save', { input })
export const testProvider = (input: WorkProviderInput) =>
  invoke<WorkProviderTestResult>('work_provider_test', { input })
export const deleteProvider = (id: string) => invoke<void>('work_provider_delete', { id })

export const getPreferences = () => invoke<WorkPreferences>('work_preferences_get')
export const savePreferences = (input: WorkPreferencesInput) =>
  invoke<WorkPreferences>('work_preferences_save', { input })

export const getSkillLocalState = () => invoke<WorkSkillLocalState>('work_skill_local_state')

const normalizeCapabilities = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  return []
}

export const listSkills = (param?: SkillListParam): Promise<WorkSkill[]> =>
  Promise.all([skillApi.list(param ?? {}), getSkillLocalState()]).then(([remote, local]) => {
    if (remote.code !== 0) {
      return Promise.reject(new Error('WORK_SKILL_LIST_FAILED'))
    }
    const rows = Array.isArray(remote.data) ? remote.data : []
    const installed = new Set(local.installedIds)
    const disabled = new Set(local.disabledIds)
    return rows.map((skill) => {
      const isInstalled = installed.has(skill.id)
      const raw = skill as Skill & { icon_url?: string }
      return {
        ...skill,
        capabilities: normalizeCapabilities(skill.capabilities),
        content: skill.content || '',
        iconUrl: (raw.iconUrl || raw.icon_url || '').trim(),
        installed: isInstalled,
        enabled: isInstalled && !disabled.has(skill.id)
      }
    })
  })

export const installSkill = (id: string, content: string) => invoke<void>('work_skill_install', { id, content })
export const uninstallSkill = (id: string) => invoke<void>('work_skill_uninstall', { id })
export const setSkillEnabled = (id: string, enabled: boolean) => invoke<void>('work_skill_set_enabled', { id, enabled })

export const createSession = (runtimeId: string, scopeMode: WorkScopeMode, conversationId: string, cwd?: string) =>
  invoke<WorkSessionResult>('work_session_new', {
    input: { runtimeId, scopeMode, conversationId, cwd: cwd || null }
  })
export const promptSession = (
  runtimeId: string,
  sessionId: string,
  text: string,
  attachments: WorkAttachmentRecord[]
) =>
  invoke<Record<string, unknown>>('work_session_prompt', {
    input: {
      runtimeId,
      sessionId,
      text,
      attachments: attachments.map(({ path, name, mimeType, category }) => ({ path, name, mimeType, category }))
    }
  })
export const cancelSession = (runtimeId: string, sessionId: string) =>
  invoke<void>('work_session_cancel', { input: { runtimeId, sessionId } })
export const closeSession = (runtimeId: string, sessionId: string) =>
  invoke<void>('work_session_close', { input: { runtimeId, sessionId } })
export const setSessionConfig = (runtimeId: string, sessionId: string, optionId: string, value: string) =>
  invoke<Record<string, unknown>>('work_session_set_config', {
    input: { runtimeId, sessionId, optionId, value }
  })
export const resolvePermission = (runtimeId: string, requestId: string, optionId?: string) =>
  invoke<void>('work_session_resolve_permission', { input: { runtimeId, requestId, optionId } })

export const getStatus = () => invoke<WorkStatus>('work_status')
export const onWorkEvent = (handler: (event: WorkEvent) => void): Promise<UnlistenFn> =>
  listen<WorkEvent>(WORK_EVENT, (event) => handler(event.payload))
