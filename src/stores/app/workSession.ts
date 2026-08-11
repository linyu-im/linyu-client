import type { UnlistenFn } from '@tauri-apps/api/event'
import { defineStore } from 'pinia'
import { saveWorkMessage, saveWorkStep, type WorkAttachmentRecord, type WorkStepRecord } from '@/db/workAssistant'
import i18n from '@/services/i18n'
import * as workService from '@/services/workService'
import { useUserStore } from '@/stores/user/user'
import type { WorkEvent, WorkPermissionOption, WorkPermissionRequest } from '@/types/cmd/work'
import { showNotification } from '@/utils/desktop/notification'

export interface WorkLiveMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  runId: string
  attachments: WorkAttachmentRecord[]
  createdAt: string
  streaming?: boolean
}

export interface WorkLiveActivity {
  id: string
  title: string
  kind: string
  status: string
  detail?: string
}

export interface WorkLivePlanEntry {
  content: string
  status: string
}

type WorkSessionState = {
  sessionId: string
  conversationId: string
  conversationTitle: string
  busy: boolean
  stalled: boolean
  currentRunId: string
  runStartedAt: number
  lastActivityAt: number
  runningConversationIds: string[]
  listening: boolean
  liveMessages: WorkLiveMessage[]
  liveSteps: WorkStepRecord[]
  liveActivities: WorkLiveActivity[]
  livePlanEntries: WorkLivePlanEntry[]
  permissionQueue: WorkPermissionRequest[]
  permissionRequest: WorkPermissionRequest | null
}

let unlisten: UnlistenFn | undefined

const emptyLive = () => ({
  liveMessages: [] as WorkLiveMessage[],
  liveSteps: [] as WorkStepRecord[],
  liveActivities: [] as WorkLiveActivity[],
  livePlanEntries: [] as WorkLivePlanEntry[]
})

const normalizeStepStatus = (status: string): WorkStepRecord['status'] => {
  if (['completed', 'success', 'succeeded'].includes(status)) return 'completed'
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['cancelled', 'canceled'].includes(status)) return 'cancelled'
  if (['in_progress', 'running'].includes(status)) return 'in_progress'
  if (['waiting_approval', 'waiting'].includes(status)) return 'waiting_approval'
  return 'pending'
}

const resolveUserId = () => {
  const userStore = useUserStore()
  return userStore.userInfo.id || userStore.authInfo.userId || ''
}

export const useWorkSessionStore = defineStore('workSession', {
  persist: false,
  share: {
    enable: true,
    initialize: true
  },
  state: (): WorkSessionState => ({
    sessionId: '',
    conversationId: '',
    conversationTitle: '',
    busy: false,
    stalled: false,
    currentRunId: '',
    runStartedAt: 0,
    lastActivityAt: 0,
    runningConversationIds: [],
    listening: false,
    ...emptyLive(),
    permissionQueue: [],
    permissionRequest: null
  }),
  actions: {
    async ensureListening() {
      if (this.listening) return
      this.$patch({ listening: true })
      unlisten = await workService.onWorkEvent((event) => {
        this.handleEvent(event)
      })
    },
    setSessionId(sessionId: string) {
      this.$patch({ sessionId })
    },
    isViewingLive(conversationId: string) {
      return Boolean(conversationId && conversationId === this.conversationId && this.liveMessages.length)
    },
    startRun(input: {
      conversationId: string
      conversationTitle?: string
      runId: string
      sessionId?: string
      baseMessages?: WorkLiveMessage[]
      userMessage: WorkLiveMessage
      assistantMessage: WorkLiveMessage
      startingStep: WorkStepRecord
    }) {
      const runningConversationIds = this.runningConversationIds.includes(input.conversationId)
        ? this.runningConversationIds
        : [...this.runningConversationIds, input.conversationId]
      this.$patch({
        conversationId: input.conversationId,
        conversationTitle: input.conversationTitle || this.conversationTitle,
        currentRunId: input.runId,
        sessionId: input.sessionId ?? this.sessionId,
        busy: true,
        stalled: false,
        runStartedAt: Date.now(),
        lastActivityAt: Date.now(),
        runningConversationIds,
        liveMessages: [...(input.baseMessages || []), input.userMessage, input.assistantMessage],
        liveSteps: [input.startingStep],
        liveActivities: [],
        livePlanEntries: []
      })
    },
    touchActivity() {
      this.$patch({
        lastActivityAt: Date.now(),
        stalled: false
      })
    },
    setStalled(stalled: boolean) {
      this.$patch({ stalled })
    },
    handleEvent(event: WorkEvent) {
      if (event.sessionId && this.sessionId && event.sessionId !== this.sessionId) return
      if (['prompt_started', 'prompt_completed', 'prompt_failed', 'session_update'].includes(event.kind)) {
        this.touchActivity()
      }
      if (event.kind === 'session_update') this.handleSessionUpdate(event.payload)
      if (event.kind === 'permission_request' && event.requestId) this.handlePermissionRequest(event)
      if (event.kind === 'runtime_stopped') {
        this.failRunLocal(i18n.global.t('ai.work.errors.runtimeDisconnected')).catch(() => undefined)
      }
    },
    handleSessionUpdate(payload: Record<string, unknown>) {
      if (!this.busy || !this.conversationId || !this.currentRunId) return
      const updateType = String(payload.sessionUpdate || '')
      if (updateType === 'agent_message_chunk') {
        const content = payload.content as { text?: string } | undefined
        const assistant = [...this.liveMessages].reverse().find((item) => item.role === 'assistant' && item.streaming)
        if (assistant && content?.text) {
          assistant.content += content.text
          this.$patch({ liveMessages: [...this.liveMessages] })
        }
        return
      }
      if (updateType === 'tool_call' || updateType === 'tool_call_update') {
        const id = String(payload.toolCallId || crypto.randomUUID())
        const existing = this.liveActivities.find((item) => item.id === id)
        const rawStatus = String(payload.status || 'pending')
        const status = normalizeStepStatus(rawStatus)
        const next: WorkLiveActivity = {
          id,
          title: String(payload.title || i18n.global.t('ai.work.activity.tool')),
          kind: String(payload.kind || 'other'),
          status: rawStatus,
          detail: Array.isArray(payload.locations)
            ? String((payload.locations[0] as { path?: string })?.path || '')
            : ''
        }
        const liveActivities = existing
          ? this.liveActivities.map((item) => (item.id === id ? next : item))
          : [next, ...this.liveActivities]
        const previous = this.liveSteps.find((step) => step.id === id)
        const step: WorkStepRecord = {
          id,
          userId: resolveUserId(),
          conversationId: this.conversationId,
          runId: this.currentRunId,
          title: next.title,
          kind: next.kind,
          status,
          detail: next.detail || '',
          payloadJson: JSON.stringify(payload),
          sequence: previous?.sequence ?? this.liveSteps.length,
          startedAt: previous?.startedAt || new Date().toISOString(),
          completedAt: ['completed', 'failed', 'cancelled'].includes(status) ? new Date().toISOString() : ''
        }
        const liveSteps = previous
          ? this.liveSteps.map((item) => (item.id === id ? step : item))
          : [...this.liveSteps, step]
        this.$patch({ liveActivities, liveSteps })
        saveWorkStep(step).catch(() => undefined)
        return
      }
      if (updateType === 'plan') {
        const entries = Array.isArray(payload.entries) ? (payload.entries as WorkLivePlanEntry[]) : []
        const liveSteps = [...this.liveSteps]
        entries.forEach((entry, index) => {
          const id = `${this.currentRunId}:plan:${index}`
          const previous = liveSteps.find((step) => step.id === id)
          const step: WorkStepRecord = {
            id,
            userId: resolveUserId(),
            conversationId: this.conversationId,
            runId: this.currentRunId,
            title: entry.content,
            kind: 'plan',
            status: normalizeStepStatus(entry.status),
            detail: '',
            payloadJson: JSON.stringify(entry),
            sequence: previous?.sequence ?? index,
            startedAt: previous?.startedAt || new Date().toISOString(),
            completedAt: entry.status === 'completed' ? new Date().toISOString() : ''
          }
          const found = liveSteps.findIndex((item) => item.id === id)
          if (found >= 0) liveSteps[found] = step
          else liveSteps.push(step)
          saveWorkStep(step).catch(() => undefined)
        })
        this.$patch({ livePlanEntries: entries, liveSteps })
      }
    },
    handlePermissionRequest(event: WorkEvent) {
      if (!event.requestId) return
      const toolCall = (event.payload.toolCall || {}) as Record<string, unknown>
      const request: WorkPermissionRequest = {
        requestId: event.requestId,
        title: String(toolCall.title || i18n.global.t('ai.work.permission.action')),
        kind: String(toolCall.kind || 'other'),
        rawInput: toolCall.rawInput as Record<string, unknown> | undefined,
        options: (event.payload.options || []) as WorkPermissionOption[]
      }
      const permissionQueue = [...this.permissionQueue, request]
      this.$patch((state) => {
        state.permissionQueue = permissionQueue
        state.permissionRequest = permissionQueue[0] ?? null
      })
      if (this.busy && this.conversationId && this.currentRunId) {
        const permissionStep: WorkStepRecord = {
          id: `permission:${event.requestId}`,
          userId: resolveUserId(),
          conversationId: this.conversationId,
          runId: this.currentRunId,
          title: request.title,
          kind: 'approval',
          status: 'waiting_approval',
          detail: i18n.global.t('ai.work.run.waitingApproval'),
          payloadJson: JSON.stringify(event.payload),
          sequence: this.liveSteps.length,
          startedAt: new Date().toISOString(),
          completedAt: ''
        }
        this.$patch({ liveSteps: [...this.liveSteps, permissionStep] })
        saveWorkStep(permissionStep).catch(() => undefined)
      }
      if (this.conversationId) {
        const taskTitle = this.conversationTitle || i18n.global.t('ai.work.welcome.newTask')
        showNotification({
          title: i18n.global.t('ai.work.brand'),
          body: i18n.global.t('ai.work.notify.permission', {
            title: taskTitle,
            action: request.title
          }),
          extra: {
            type: 'work',
            kind: 'permission',
            conversationId: this.conversationId
          }
        }).catch(() => false)
      }
    },
    async resolvePermission(runtimeId: string, optionId?: string) {
      const current = this.permissionRequest
      if (!current) return
      await workService.resolvePermission(runtimeId, current.requestId, optionId)
      const step = this.liveSteps.find((item) => item.id === `permission:${current.requestId}`)
      if (step) {
        step.status = optionId ? 'completed' : 'cancelled'
        step.completedAt = new Date().toISOString()
        await saveWorkStep(step)
        this.$patch({ liveSteps: [...this.liveSteps] })
      }
      const permissionQueue = this.permissionQueue.filter((item) => item.requestId !== current.requestId)
      this.$patch((state) => {
        state.permissionQueue = permissionQueue
        state.permissionRequest = permissionQueue[0] ?? null
      })
    },
    async finishStepState(runId: string, status: WorkStepRecord['status']) {
      const completedAt = new Date().toISOString()
      const liveSteps = this.liveSteps.map((step) => {
        if (step.runId !== runId || !['pending', 'in_progress', 'waiting_approval'].includes(step.status)) {
          return step
        }
        return { ...step, status, completedAt }
      })
      this.$patch({ liveSteps })
      await Promise.all(liveSteps.filter((step) => step.runId === runId).map((step) => saveWorkStep(step)))
    },
    async persistAssistant(fallbackContent?: string) {
      const assistant = [...this.liveMessages].reverse().find((item) => item.role === 'assistant')
      if (!assistant || !this.conversationId) return
      assistant.streaming = false
      if (!assistant.content && fallbackContent) assistant.content = fallbackContent
      this.$patch({ liveMessages: [...this.liveMessages] })
      if (assistant.content) {
        const userId = resolveUserId()
        await saveWorkMessage({
          id: assistant.id,
          userId,
          conversationId: this.conversationId,
          role: assistant.role,
          content: assistant.content,
          runId: assistant.runId,
          attachments: assistant.attachments.map((attachment) => ({
            ...attachment,
            userId
          })),
          createdAt: assistant.createdAt
        })
      }
    },
    clearRunFlags(options?: { keepSession?: boolean; clearLive?: boolean }) {
      const conversationId = this.conversationId
      this.$patch({
        busy: false,
        stalled: false,
        currentRunId: '',
        runStartedAt: 0,
        runningConversationIds: conversationId
          ? this.runningConversationIds.filter((id) => id !== conversationId)
          : this.runningConversationIds,
        sessionId: options?.keepSession === false ? '' : this.sessionId,
        ...(options?.clearLive
          ? {
              ...emptyLive(),
              conversationId: options.keepSession === false ? '' : this.conversationId
            }
          : {})
      })
    },
    notifyRunResult(kind: 'completed' | 'failed', title?: string) {
      const conversationId = this.conversationId
      if (!conversationId) return
      const taskTitle = title || this.conversationTitle || i18n.global.t('ai.work.welcome.newTask')
      const body = i18n.global.t(kind === 'completed' ? 'ai.work.notify.completed' : 'ai.work.notify.failed', {
        title: taskTitle
      })
      showNotification({
        title: i18n.global.t('ai.work.brand'),
        body,
        extra: {
          type: 'work',
          kind,
          conversationId
        }
      }).catch(() => false)
    },
    async completeRun(options?: { title?: string; notify?: boolean }) {
      const runId = this.currentRunId
      const title = options?.title || this.conversationTitle
      await this.persistAssistant()
      if (runId) await this.finishStepState(runId, 'completed')
      this.clearRunFlags({ keepSession: true, clearLive: false })
      // Keep live snapshot until next startRun / explicit clear so UI can still show it.
      if (options?.notify !== false) this.notifyRunResult('completed', title)
    },
    async failRun(options?: { title?: string; notify?: boolean; errorText?: string }) {
      await this.failRunLocal(options?.errorText, options)
    },
    async failRunLocal(errorText?: string, options?: { title?: string; notify?: boolean }) {
      const runId = this.currentRunId
      const title = options?.title || this.conversationTitle
      await this.persistAssistant(errorText)
      if (runId) await this.finishStepState(runId, 'failed')
      this.clearRunFlags({ keepSession: true, clearLive: false })
      if (options?.notify !== false) this.notifyRunResult('failed', title)
    },
    async cancelRun(runtimeId: string) {
      const runId = this.currentRunId
      try {
        if (this.sessionId) await workService.cancelSession(runtimeId, this.sessionId)
      } finally {
        await this.persistAssistant()
        if (runId) await this.finishStepState(runId, 'cancelled')
        this.clearRunFlags({ keepSession: true, clearLive: false })
      }
    },
    clearLiveIfNot(conversationId: string) {
      if (this.conversationId && this.conversationId !== conversationId && !this.busy) {
        this.$patch({ ...emptyLive(), conversationId: '' })
      }
    },
    resetLive() {
      this.$patch({ ...emptyLive() })
    },
    async closeBoundSession(runtimeId: string) {
      const sessionId = this.sessionId
      if (!sessionId) return
      await workService.closeSession(runtimeId, sessionId).catch(() => undefined)
      this.$patch({ sessionId: '' })
    },
    async stopListening() {
      unlisten?.()
      unlisten = undefined
      this.$patch({ listening: false })
    }
  }
})
