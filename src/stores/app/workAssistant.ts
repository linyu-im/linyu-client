import { defineStore } from 'pinia'
import * as workService from '@/services/workService'
import type {
  WorkApprovalMode,
  WorkMode,
  WorkPreferencesInput,
  WorkProvider,
  WorkProviderInput,
  WorkRuntime,
  WorkScopeMode,
  WorkSkill,
  WorkStatus
} from '@/types/cmd/work'

interface WorkAssistantState {
  runtimes: WorkRuntime[]
  providers: WorkProvider[]
  skills: WorkSkill[]
  status: WorkStatus | null
  activeRuntimeId: string
  activeProviderId?: string
  activeModel?: string
  approvalMode: WorkApprovalMode
  workMode: WorkMode
  workspacePath: string
  scopeMode: WorkScopeMode
  loading: boolean
  initialized: boolean
}

export const useWorkAssistantStore = defineStore('workAssistant', {
  persist: {
    pick: [
      'activeRuntimeId',
      'activeProviderId',
      'activeModel',
      'approvalMode',
      'workMode',
      'workspacePath',
      'scopeMode'
    ]
  },
  share: {
    enable: true,
    initialize: true
  },
  state: (): WorkAssistantState => ({
    runtimes: [],
    providers: [],
    skills: [],
    status: null,
    activeRuntimeId: 'reasonix',
    activeProviderId: undefined,
    activeModel: undefined,
    approvalMode: 'ask',
    workMode: 'balanced',
    workspacePath: '',
    scopeMode: 'chat',
    loading: false,
    initialized: false
  }),
  actions: {
    async initialize() {
      if (this.loading) return
      this.$patch({ loading: true })
      try {
        const [runtimes, preferences, status] = await Promise.all([
          workService.listRuntimes(),
          workService.getPreferences(),
          workService.getStatus()
        ])
        this.$patch({
          runtimes,
          providers: preferences.providers,
          status,
          activeRuntimeId: preferences.activeRuntimeId,
          activeProviderId: preferences.activeProviderId,
          activeModel: preferences.activeModel,
          approvalMode: preferences.approvalMode,
          workMode: preferences.workMode,
          initialized: true
        })
        // Skills 来自远程接口，失败不应阻断 AI 工作台
        await this.refreshSkills().catch(() => undefined)
      } finally {
        this.$patch({ loading: false })
      }
    },
    async refreshSkills() {
      try {
        const [skills, status] = await Promise.all([workService.listSkills(), workService.getStatus()])
        this.$patch({ skills, status })
      } catch (error) {
        const status = await workService.getStatus().catch(() => this.status)
        this.$patch({ skills: [], status: status ?? this.status })
        throw error
      }
    },
    async refreshStatus() {
      const [runtimes, status] = await Promise.all([workService.listRuntimes(), workService.getStatus()])
      this.$patch({ runtimes, status })
    },
    async saveProvider(input: WorkProviderInput) {
      const provider = await workService.saveProvider(input)
      const preferences = await workService.getPreferences()
      this.$patch({
        providers: preferences.providers,
        activeProviderId: preferences.activeProviderId,
        activeModel: preferences.activeModel
      })
      return provider
    },
    async removeProvider(id: string) {
      await workService.deleteProvider(id)
      const preferences = await workService.getPreferences()
      this.$patch({
        providers: preferences.providers,
        activeProviderId: preferences.activeProviderId,
        activeModel: preferences.activeModel
      })
    },
    async savePreferences(input?: Partial<WorkPreferencesInput>) {
      const preferences = await workService.savePreferences({
        activeRuntimeId: input?.activeRuntimeId ?? this.activeRuntimeId,
        activeProviderId: input?.activeProviderId ?? this.activeProviderId,
        activeModel: input?.activeModel ?? this.activeModel,
        approvalMode: input?.approvalMode ?? this.approvalMode,
        workMode: input?.workMode ?? this.workMode
      })
      this.$patch({
        providers: preferences.providers,
        activeRuntimeId: preferences.activeRuntimeId,
        activeProviderId: preferences.activeProviderId,
        activeModel: preferences.activeModel,
        approvalMode: preferences.approvalMode,
        workMode: preferences.workMode
      })
    },
    setWorkspace(path: string) {
      this.$patch({ workspacePath: path })
    },
    setScopeMode(scopeMode: WorkScopeMode) {
      this.$patch({ scopeMode })
    },
    testProvider(input: WorkProviderInput) {
      return workService.testProvider(input)
    },
    async installSkill(id: string) {
      const skill = this.skills.find((item) => item.id === id)
      if (!skill?.content?.trim()) throw new Error('WORK_SKILL_CONTENT_REQUIRED')
      await workService.installSkill(id, skill.content)
      await this.refreshSkills()
    },
    async uninstallSkill(id: string) {
      await workService.uninstallSkill(id)
      await this.refreshSkills()
    },
    async toggleSkill(id: string, enabled: boolean) {
      await workService.setSkillEnabled(id, enabled)
      await this.refreshSkills()
    }
  }
})
