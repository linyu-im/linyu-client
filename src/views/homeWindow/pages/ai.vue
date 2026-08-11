<template>
  <div class="workbench" @keydown.capture="onWorkbenchKeydown">
    <div class="workbench__body">
      <aside class="workbench__sidebar">
        <nav class="workbench__nav">
          <button type="button" :class="{ active: activeView === 'chat' && !conversationId }" @click="newConversation">
            <svg><use href="#message-plus" /></svg>
            <span>{{ t('ai.menu.newChat') }}</span>
          </button>
          <button type="button" :class="{ active: activeView === 'skills' }" @click="activeView = 'skills'">
            <svg><use href="#star" /></svg>
            <span>{{ t('ai.work.nav.skills') }}</span>
          </button>
        </nav>

        <div class="workbench__history-head">
          <span>{{ t('ai.history.title') }}</span>
        </div>
        <n-scrollbar class="workbench__history-scroll">
          <div class="workbench__history-list">
            <div
              v-for="item in conversations"
              :key="item.id"
              class="workbench__history-item"
              :class="{
                active: activeView === 'chat' && conversationId === item.id,
                renaming: renamingId === item.id
              }">
              <button
                v-if="renamingId !== item.id"
                type="button"
                class="workbench__history-main"
                @click="openConversation(item)">
                <svg v-if="sessionStore.runningConversationIds.includes(item.id)" class="workbench__history-loading">
                  <use href="#refresh" />
                </svg>
                <svg v-else>
                  <use :href="item.scopeMode === 'workspace' ? '#folder' : '#message'" />
                </svg>
                <strong>{{ item.title }}</strong>
              </button>
              <div v-else class="workbench__history-main workbench__history-rename">
                <svg>
                  <use :href="item.scopeMode === 'workspace' ? '#folder' : '#message'" />
                </svg>
                <input
                  :ref="(el) => setRenameInputRef(el)"
                  v-model="renameDraft"
                  type="text"
                  maxlength="64"
                  :placeholder="t('ai.history.renamePlaceholder')"
                  @click.stop
                  @keydown.enter.prevent="commitRename"
                  @keydown.escape.prevent="cancelRename"
                  @blur="commitRename" />
              </div>
              <n-dropdown
                v-if="renamingId !== item.id"
                trigger="click"
                placement="bottom-end"
                :options="historyMenuOptions"
                @select="(key) => onHistoryMenuSelect(key, item)">
                <button type="button" class="workbench__history-more" :title="t('ai.history.more')" @click.stop>
                  <svg><use href="#more" /></svg>
                </button>
              </n-dropdown>
              <span v-else class="workbench__history-more workbench__history-more--spacer" />
            </div>
            <div v-if="!conversations.length" class="workbench__history-empty">{{ t('ai.history.empty') }}</div>
          </div>
        </n-scrollbar>

        <div class="workbench__workspace-slot">
          <button
            v-if="store.scopeMode === 'workspace'"
            type="button"
            class="workbench__workspace"
            @click="chooseWorkspace">
            <span class="workbench__workspace-icon">
              <svg><use href="#folder" /></svg>
            </span>
            <span>
              <small>{{ scopeLabel }}</small>
              <strong>{{ workspaceName }}</strong>
            </span>
          </button>
        </div>
      </aside>

      <main class="workbench__main">
        <template v-if="activeView === 'skills'">
          <n-scrollbar class="workbench__page-scroll"><SkillsMarket /></n-scrollbar>
        </template>

        <template v-else>
          <header class="workbench__topbar" :class="{ 'workbench__topbar--locked': conversationId }">
            <div class="workbench__session-title">
              <strong>{{ currentTitle }}</strong>
            </div>
            <div v-if="!conversationId" class="workbench__scope-switch" :aria-label="scopeSwitchLabel">
              <button type="button" :class="{ active: store.scopeMode === 'chat' }" @click="selectScopeMode('chat')">
                <svg><use href="#message" /></svg>
                {{ t('ai.work.scope.chat') }}
              </button>
              <button
                type="button"
                :class="{ active: store.scopeMode === 'workspace' }"
                @click="selectScopeMode('workspace')">
                <svg><use href="#folder" /></svg>
                {{ t('ai.work.scope.workspace') }}
              </button>
            </div>
            <div v-else class="workbench__scope-badge">
              <svg><use :href="sessionScopeIcon" /></svg>
              <span>{{ sessionScopeLabel }}</span>
            </div>
          </header>

          <div class="workbench__chat-layout">
            <section class="workbench__chat">
              <div v-if="!displayMessages.length" class="workbench__welcome">
                <div class="workbench__welcome-mark">
                  <img src="/ai-logo.png" alt="" />
                </div>
                <h1>{{ t('ai.work.welcome.title') }}</h1>
                <p>{{ t('ai.work.welcome.subtitle') }}</p>

                <div v-if="store.initialized && !isReady" class="workbench__setup-card">
                  <div>
                    <strong>{{ setupTitle }}</strong>
                    <span>{{ setupDescription }}</span>
                  </div>
                  <n-button
                    v-if="!runtime?.installed"
                    size="small"
                    type="primary"
                    :loading="installing"
                    @click="installRuntime">
                    {{ t('ai.work.setup.install') }}
                  </n-button>
                  <n-button v-else-if="needsProviderSetup" size="small" type="primary" @click="openSettings">
                    {{ t('ai.work.setup.configure') }}
                  </n-button>
                  <n-button v-else size="small" type="primary" @click="chooseWorkspace">
                    {{ t('ai.work.workspace.choose') }}
                  </n-button>
                </div>

                <div class="workbench__quick-grid">
                  <button
                    v-for="action in quickActions"
                    :key="action.key"
                    type="button"
                    @click="useQuickAction(action.prompt)">
                    <span :class="`workbench__quick-icon workbench__quick-icon--${action.key}`">
                      <img :src="action.icon" alt="" />
                    </span>
                    <span>
                      <strong>{{ t(`ai.work.quick.${action.key}.title`) }}</strong>
                      <small>{{ t(`ai.work.quick.${action.key}.desc`) }}</small>
                    </span>
                    <svg class="workbench__quick-arrow"><use href="#arrow-right" /></svg>
                  </button>
                </div>
              </div>

              <n-scrollbar
                v-else
                ref="messageScrollRef"
                class="workbench__messages-scroll"
                @scroll="handleMessageScroll">
                <div class="workbench__messages">
                  <template v-for="message in displayMessages" :key="message.id">
                    <AiMessageBubble
                      :role="message.role"
                      :content="message.content"
                      :attachments="message.attachments"
                      :streaming="message.streaming"
                      :rich="message.role === 'assistant'"
                      @resized="handleMessageResized"
                      @regenerate="regenerateMessage(message)" />
                    <WorkRunTimeline
                      v-if="message.role === 'user' && message.runId && stepsByRun[message.runId]"
                      :steps="stepsByRun[message.runId]"
                      :running="isViewingLive && currentRunId === message.runId && busy"
                      :stalled="isViewingLive && currentRunId === message.runId && stalled"
                      :started-at="isViewingLive && currentRunId === message.runId ? runStartedAt : 0"
                      @continue-waiting="continueWaiting"
                      @stop="stopPrompt" />
                  </template>
                </div>
              </n-scrollbar>

              <button
                v-if="displayMessages.length && !isAtBottom"
                type="button"
                class="workbench__scroll-bottom"
                :title="t('ai.work.messages.backToBottom')"
                @click="scrollToBottom('smooth', true)">
                <svg><use href="#left-arrow" /></svg>
              </button>

              <div class="workbench__composer-wrap">
                <div v-if="workError" class="workbench__error-card">
                  <span>
                    <svg><use href="#info" /></svg>
                    {{ workErrorMessage }}
                  </span>
                  <button type="button" @click="handleErrorAction">{{ workErrorActionLabel }}</button>
                </div>
                <div class="workbench__composer" :class="{ 'workbench__composer--busy': busy }">
                  <textarea
                    ref="inputRef"
                    v-model="inputText"
                    :placeholder="t('ai.work.input.placeholder')"
                    rows="3"
                    @keydown="onInputKeydown" />
                  <WorkAttachmentList
                    v-if="attachments.length"
                    class="workbench__composer-attachments"
                    :attachments="attachments"
                    removable
                    @remove="removeAttachment" />
                  <div class="workbench__composer-bar">
                    <div>
                      <button type="button" :title="t('ai.input.attach')" @click="chooseAttachments">
                        <svg><use href="#paperclip" /></svg>
                      </button>
                      <button
                        v-if="store.scopeMode === 'workspace'"
                        type="button"
                        :title="t('ai.work.workspace.choose')"
                        @click="chooseWorkspace">
                        <svg><use href="#folder" /></svg>
                      </button>
                      <WorkExecutionPolicy
                        :work-mode="store.workMode"
                        :approval-mode="store.approvalMode"
                        :disabled="busy"
                        @update:work-mode="updateWorkMode"
                        @update:approval-mode="updateApprovalMode" />
                    </div>
                    <button
                      v-if="busy"
                      type="button"
                      class="workbench__stop"
                      :title="t('ai.work.input.stop')"
                      @click="stopPrompt">
                      <i />
                    </button>
                    <button v-else type="button" class="workbench__send" :disabled="!canSend" @click="sendPrompt">
                      <svg><use href="#arrow-up" /></svg>
                    </button>
                  </div>
                </div>
                <small class="workbench__input-hint">{{ t('ai.work.input.hint') }}</small>
              </div>
            </section>

            <aside v-if="displayActivities.length || displayPlanEntries.length" class="workbench__activity">
              <header>
                <strong>{{ t('ai.work.activity.title') }}</strong>
                <span v-if="isViewingLive && busy">{{ t('ai.work.activity.running') }}</span>
              </header>
              <n-scrollbar>
                <div v-if="displayPlanEntries.length" class="workbench__plan">
                  <span class="workbench__activity-label">{{ t('ai.work.activity.plan') }}</span>
                  <div v-for="(entry, index) in displayPlanEntries" :key="index" :class="entry.status">
                    <i />
                    <span>{{ entry.content }}</span>
                  </div>
                </div>
                <div class="workbench__tools">
                  <span class="workbench__activity-label">{{ t('ai.work.activity.tools') }}</span>
                  <article v-for="activity in displayActivities" :key="activity.id">
                    <span class="workbench__tool-icon">
                      <svg><use :href="toolIcon(activity.kind)" /></svg>
                    </span>
                    <div>
                      <strong>{{ activity.title }}</strong>
                      <small>{{ activity.detail || t(`ai.work.activity.status.${activity.status}`) }}</small>
                    </div>
                    <i :class="activity.status" />
                  </article>
                </div>
              </n-scrollbar>
            </aside>
          </div>
        </template>
      </main>
    </div>

    <WorkStatusBar :status="store.status" @open-settings="openSettings" />

    <WorkPermissionDialog
      :show="Boolean(sessionStore.permissionRequest)"
      :request="sessionStore.permissionRequest"
      @answer="answerPermission" />
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ai' })

  import { open } from '@tauri-apps/plugin-dialog'
  import { stat } from '@tauri-apps/plugin-fs'
  import type { ScrollbarInst } from 'naive-ui'
  import AiMessageBubble from '@/components/AI/MessageBubble/index.vue'
  import SkillsMarket from '@/components/AI/Work/SkillsMarket.vue'
  import WorkAttachmentList from '@/components/AI/Work/WorkAttachmentList.vue'
  import WorkExecutionPolicy from '@/components/AI/Work/WorkExecutionPolicy.vue'
  import WorkPermissionDialog from '@/components/AI/Work/WorkPermissionDialog.vue'
  import WorkRunTimeline from '@/components/AI/Work/WorkRunTimeline.vue'
  import WorkStatusBar from '@/components/AI/Work/WorkStatusBar.vue'
  import {
    deleteWorkConversation,
    listWorkConversations,
    listWorkMessages,
    listWorkSteps,
    saveWorkMessage,
    saveWorkStep,
    upsertWorkConversation,
    type WorkAttachmentRecord,
    type WorkStepRecord,
    type WorkConversationRecord
  } from '@/db/workAssistant'
  import * as workService from '@/services/workService'
  import { parseWorkError, type ParsedWorkError } from '@/services/workError'
  import { useWorkAssistantStore } from '@/stores/app/workAssistant'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import { useWorkSessionStore, type WorkLiveMessage } from '@/stores/app/workSession'
  import { useUserStore } from '@/stores/user/user'
  import type { WorkApprovalMode, WorkMode, WorkScopeMode } from '@/types/cmd/work'
  import { ensureNotificationPermission } from '@/utils/desktop/notification'
  import { createSetWinodw } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'

  type ChatMessage = WorkLiveMessage

  const { t } = useI18n()
  const dialog = useDialog()
  const store = useWorkAssistantStore()
  const sessionStore = useWorkSessionStore()
  const homeTabStore = useHomeTabStore()
  const userStore = useUserStore()
  const currentUserId = computed(() => userStore.userInfo.id || userStore.authInfo.userId || '')
  const activeView = ref<'chat' | 'skills'>('chat')
  const conversations = ref<WorkConversationRecord[]>([])
  const conversationId = ref('')
  const messages = ref<ChatMessage[]>([])
  const inputText = ref('')
  const attachments = ref<WorkAttachmentRecord[]>([])
  const steps = ref<WorkStepRecord[]>([])
  const isAtBottom = ref(true)
  const installing = ref(false)
  const inputRef = ref<HTMLTextAreaElement | null>(null)
  const messageScrollRef = ref<ScrollbarInst | null>(null)
  const workError = ref<ParsedWorkError | null>(null)
  let stalledTimer: ReturnType<typeof setInterval> | undefined
  let applyingAiPayload = false

  const busy = computed(() => sessionStore.busy)
  const stalled = computed(() => sessionStore.stalled)
  const currentRunId = computed(() => sessionStore.currentRunId)
  const runStartedAt = computed(() => sessionStore.runStartedAt)
  const isViewingLive = computed(() => sessionStore.isViewingLive(conversationId.value))
  const displayMessages = computed(() => (isViewingLive.value ? sessionStore.liveMessages : messages.value))
  const displaySteps = computed(() => (isViewingLive.value ? sessionStore.liveSteps : steps.value))
  const displayActivities = computed(() => (isViewingLive.value ? sessionStore.liveActivities : []))
  const displayPlanEntries = computed(() => (isViewingLive.value ? sessionStore.livePlanEntries : []))

  const runtime = computed(() => store.runtimes.find((item) => item.id === store.activeRuntimeId))
  const isReady = computed(() =>
    Boolean(
      runtime.value?.installed &&
      activeProvider.value?.hasApiKey &&
      modelLabel.value &&
      (store.scopeMode === 'chat' || store.workspacePath)
    )
  )
  const canSend = computed(() => Boolean((inputText.value.trim() || attachments.value.length) && !busy.value))
  const stepsByRun = computed(() =>
    displaySteps.value.reduce<Record<string, WorkStepRecord[]>>((result, step) => {
      result[step.runId] ||= []
      result[step.runId].push(step)
      return result
    }, {})
  )
  const currentConversation = computed(() => conversations.value.find((item) => item.id === conversationId.value))
  const currentTitle = computed(() => currentConversation.value?.title || t('ai.work.welcome.newTask'))
  const activeProvider = computed(() => store.providers.find((item) => item.id === store.activeProviderId))
  const needsProviderSetup = computed(() =>
    Boolean(!activeProvider.value?.hasApiKey || !(store.activeModel || activeProvider.value?.defaultModel))
  )
  const modelLabel = computed(
    () => store.activeModel || activeProvider.value?.defaultModel || t('ai.work.status.noModel')
  )
  const workspaceName = computed(() =>
    store.scopeMode === 'chat'
      ? t('ai.work.scope.chatDescription')
      : fileName(store.workspacePath) || t('ai.work.workspace.choose')
  )
  const scopeLabel = computed(() =>
    store.scopeMode === 'chat' ? t('ai.work.scope.chat') : t('ai.work.workspace.label')
  )
  const scopeSwitchLabel = computed(() => t('ai.work.scope.label'))
  const sessionScopeLabel = computed(() =>
    store.scopeMode === 'chat' ? t('ai.work.scope.chat') : t('ai.work.scope.workspace')
  )
  const sessionScopeIcon = computed(() => (store.scopeMode === 'chat' ? '#message' : '#folder'))
  const setupTitle = computed(() =>
    !runtime.value?.installed
      ? t('ai.work.setup.runtimeTitle')
      : needsProviderSetup.value
        ? t('ai.work.setup.providerTitle')
        : t('ai.work.setup.workspaceTitle')
  )
  const setupDescription = computed(() =>
    !runtime.value?.installed
      ? t('ai.work.setup.runtimeDesc')
      : needsProviderSetup.value
        ? t('ai.work.setup.providerDesc')
        : t('ai.work.setup.workspaceDesc')
  )
  const workErrorMessage = computed(() => (workError.value ? t(workError.value.key) : ''))
  const workErrorActionLabel = computed(() => t(`ai.work.errors.actions.${workError.value?.action || 'retry'}`))
  const quickActions = computed(() =>
    [
      { key: 'sheet', icon: '/ai-excel.png' },
      { key: 'document', icon: '/ai-document.png' },
      { key: 'image', icon: '/ai-images.png' },
      { key: 'files', icon: '/ai-folder.png' }
    ].map((item) => ({ ...item, prompt: t(`ai.work.quick.${item.key}.prompt`) }))
  )

  const fileName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || ''
  const attachmentCategory = (path: string): WorkAttachmentRecord['category'] => {
    const extension = path.split('.').pop()?.toLowerCase() || ''
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(extension)) return 'image'
    if (['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(extension)) return 'spreadsheet'
    if (extension === 'pdf') return 'pdf'
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive'
    if (['doc', 'docx', 'txt', 'md', 'rtf', 'ppt', 'pptx'].includes(extension)) return 'document'
    return 'other'
  }
  const attachmentMimeType = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase() || ''
    return (
      (
        {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          webp: 'image/webp',
          pdf: 'application/pdf',
          csv: 'text/csv',
          txt: 'text/plain',
          md: 'text/markdown',
          json: 'application/json',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        } as Record<string, string>
      )[extension] || 'application/octet-stream'
    )
  }
  const createAttachment = (path: string, info: { size: number }): WorkAttachmentRecord => ({
    id: crypto.randomUUID(),
    userId: currentUserId.value,
    messageId: '',
    conversationId: conversationId.value,
    name: fileName(path),
    path,
    mimeType: attachmentMimeType(path),
    size: info.size,
    category: attachmentCategory(path),
    createdAt: new Date().toISOString()
  })
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth', force = false) => {
    if (!force && !isAtBottom.value) return
    nextTick(() => {
      requestAnimationFrame(() => {
        messageScrollRef.value?.scrollTo({ top: 999999, behavior })
        isAtBottom.value = true
      })
    })
  }
  const handleMessageScroll = (event: Event) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    isAtBottom.value = target.scrollHeight - target.scrollTop - target.clientHeight < 80
  }
  const handleMessageResized = () => scrollToBottom('auto')
  const openSettings = () => createSetWinodw('work')
  const toolIcon = (kind: string) =>
    ({ read: '#document', edit: '#edit', execute: '#terminal', search: '#search' })[kind] || '#settings'

  const renamingId = ref('')
  const renameDraft = ref('')
  const renameInputRef = ref<HTMLInputElement | null>(null)

  const loadHistory = async () => {
    if (!currentUserId.value) {
      conversations.value = []
      return
    }
    conversations.value = await listWorkConversations(currentUserId.value)
  }
  const touchConversation = async (id: string, patch?: Partial<WorkConversationRecord>) => {
    if (!id || !currentUserId.value) return
    const index = conversations.value.findIndex((item) => item.id === id)
    if (index === -1) return
    const next: WorkConversationRecord = {
      ...conversations.value[index],
      ...patch,
      userId: currentUserId.value,
      updatedAt: new Date().toISOString()
    }
    conversations.value = [next, ...conversations.value.filter((item) => item.id !== id)]
    await upsertWorkConversation(next)
  }
  const historyMenuOptions = computed(() => [
    { label: () => t('ai.history.rename'), key: 'rename' },
    {
      label: () => t('ai.history.delete'),
      key: 'delete',
      props: { class: 'workbench-history-menu__danger' }
    }
  ])

  const setRenameInputRef = (el: unknown) => {
    renameInputRef.value = el instanceof HTMLInputElement ? el : null
  }
  const startRename = (record: WorkConversationRecord) => {
    renamingId.value = record.id
    renameDraft.value = record.title
    nextTick(() => {
      renameInputRef.value?.focus()
      renameInputRef.value?.select()
    })
  }
  const cancelRename = () => {
    renamingId.value = ''
    renameDraft.value = ''
  }
  const commitRename = async () => {
    const id = renamingId.value
    const title = renameDraft.value.trim()
    renamingId.value = ''
    renameDraft.value = ''
    if (!id || !title) return

    const index = conversations.value.findIndex((item) => item.id === id)
    if (index === -1 || conversations.value[index].title === title) return

    const next: WorkConversationRecord = { ...conversations.value[index], title, userId: currentUserId.value }
    conversations.value = conversations.value.map((item) => (item.id === id ? next : item))
    await upsertWorkConversation(next)
    if (sessionStore.conversationId === id) {
      sessionStore.$patch({ conversationTitle: title })
    }
  }
  const confirmDeleteConversation = (record: WorkConversationRecord) => {
    dialog.warning({
      title: t('ai.history.delete'),
      content: t('ai.history.deleteConfirm', { title: record.title }),
      positiveText: t('ai.history.delete'),
      negativeText: t('common.cancel'),
      onPositiveClick: () => deleteConversation(record)
    })
  }
  const onHistoryMenuSelect = (key: string | number, record: WorkConversationRecord) => {
    if (key === 'rename') startRename(record)
    else if (key === 'delete') confirmDeleteConversation(record)
  }
  const newConversation = async () => {
    activeView.value = 'chat'
    conversationId.value = ''
    messages.value = []
    steps.value = []
    inputText.value = ''
    attachments.value = []
    isAtBottom.value = true
    if (store.scopeMode === 'workspace') store.setWorkspace('')
    nextTick(() => inputRef.value?.focus())
  }
  const openConversation = async (record: WorkConversationRecord) => {
    activeView.value = 'chat'
    conversationId.value = record.id
    store.setScopeMode(record.scopeMode || 'chat')
    store.setWorkspace(record.workspacePath || '')
    if (sessionStore.isViewingLive(record.id)) {
      messages.value = []
      steps.value = []
    } else {
      const [messageRecords, stepRecords] = await Promise.all([
        listWorkMessages(currentUserId.value, record.id),
        listWorkSteps(currentUserId.value, record.id)
      ])
      messages.value = messageRecords.map((item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
        runId: item.runId,
        attachments: item.attachments,
        createdAt: item.createdAt
      }))
      steps.value = stepRecords
    }
    isAtBottom.value = true
    scrollToBottom('auto', true)
  }
  const deleteConversation = async (record: WorkConversationRecord) => {
    const wasActive = conversationId.value === record.id
    const wasRunning =
      sessionStore.conversationId === record.id &&
      (sessionStore.busy || sessionStore.runningConversationIds.includes(record.id))
    if (wasRunning) {
      await sessionStore.cancelRun(store.activeRuntimeId)
      await sessionStore.closeBoundSession(store.activeRuntimeId)
      sessionStore.clearRunFlags({ keepSession: false, clearLive: true })
    }
    await deleteWorkConversation(currentUserId.value, record.id)
    conversations.value = conversations.value.filter((item) => item.id !== record.id)
    if (!wasActive) return
    const next = conversations.value[0]
    if (next) await openConversation(next)
    else await newConversation()
    window.$message?.success(t('ai.history.deleted'))
  }
  const chooseWorkspace = async () => {
    const selected = await open({ directory: true, multiple: false, title: t('ai.work.workspace.dialogTitle') })
    if (typeof selected === 'string') {
      store.setScopeMode('workspace')
      store.setWorkspace(selected)
      workError.value = null
    }
  }
  const selectScopeMode = async (scopeMode: WorkScopeMode) => {
    if (store.scopeMode === scopeMode) return
    if (!sessionStore.busy) await sessionStore.closeBoundSession(store.activeRuntimeId)
    store.setScopeMode(scopeMode)
    workError.value = null
    if (scopeMode === 'workspace' && !store.workspacePath) await chooseWorkspace()
  }
  const chooseAttachments = async () => {
    const selected = await open({ multiple: true, directory: false, title: t('ai.work.input.attachTitle') })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    const existingPaths = new Set(attachments.value.map((item) => item.path))
    const nextAttachments = await Promise.all(
      paths
        .filter((path) => !existingPaths.has(path))
        .map(async (path) => createAttachment(path, await stat(path).catch(() => ({ size: 0 }))))
    )
    attachments.value = [...attachments.value, ...nextAttachments]
  }
  const removeAttachment = (id: string) => {
    attachments.value = attachments.value.filter((item) => item.id !== id)
  }
  const useQuickAction = (prompt: string) => {
    inputText.value = prompt
    nextTick(() => inputRef.value?.focus())
  }
  const installRuntime = async () => {
    installing.value = true
    try {
      await workService.installRuntime()
      window.$message?.success(t('ai.work.setup.installerOpened'))
    } catch (error) {
      showFriendlyError(error)
    } finally {
      installing.value = false
      await store.refreshStatus()
    }
  }

  const ensureSession = async () => {
    if (!sessionStore.sessionId) {
      const session = await workService.createSession(
        store.activeRuntimeId,
        store.scopeMode,
        conversationId.value,
        store.scopeMode === 'workspace' ? store.workspacePath : undefined
      )
      sessionStore.setSessionId(session.sessionId)
    }
  }
  const createConversationLocally = (text: string) => {
    if (conversationId.value) return null
    if (!currentUserId.value) throw new Error('WORK_USER_REQUIRED')
    const now = new Date().toISOString()
    conversationId.value = crypto.randomUUID()
    const record: WorkConversationRecord = {
      id: conversationId.value,
      userId: currentUserId.value,
      title: text.slice(0, 28),
      runtimeId: store.activeRuntimeId,
      providerId: store.activeProviderId || '',
      model: store.activeModel || '',
      workspacePath: store.workspacePath,
      scopeMode: store.scopeMode,
      createdAt: now,
      updatedAt: now
    }
    conversations.value.unshift(record)
    return record
  }
  const persistChatMessage = (message: ChatMessage, targetConversationId = conversationId.value) =>
    saveWorkMessage({
      id: message.id,
      userId: currentUserId.value,
      conversationId: targetConversationId,
      role: message.role,
      content: message.content,
      runId: message.runId,
      attachments: message.attachments.map((attachment) => ({
        ...attachment,
        userId: currentUserId.value
      })),
      createdAt: message.createdAt
    })
  const runTitle = (targetConversationId: string) =>
    conversations.value.find((item) => item.id === targetConversationId)?.title ||
    sessionStore.conversationTitle ||
    t('ai.work.welcome.newTask')
  const sendPrompt = async () => {
    const text = inputText.value.trim()
    if ((!text && !attachments.value.length) || sessionStore.busy) return
    workError.value = null
    try {
      if (!runtime.value?.installed) throw new Error('WORK_RUNTIME_NOT_INSTALLED')
      if (!activeProvider.value) throw new Error('WORK_PROVIDER_NOT_CONFIGURED')
      if (!activeProvider.value.hasApiKey) throw new Error('WORK_PROVIDER_KEY_REQUIRED')
      const activeModel = store.activeModel || activeProvider.value.defaultModel
      if (!activeModel) throw new Error('WORK_MODEL_NOT_FOUND')
      if (store.scopeMode === 'workspace' && !store.workspacePath) await chooseWorkspace()
      if (store.scopeMode === 'workspace' && !store.workspacePath) throw new Error('WORK_WORKSPACE_REQUIRED')
    } catch (error) {
      showFriendlyError(error)
      return
    }

    const displayText = text || t('ai.work.attachments.attachmentOnlyPrompt')
    const conversationRecord = createConversationLocally(displayText)
    const targetConversationId = conversationId.value
    const runId = crypto.randomUUID()
    const now = new Date().toISOString()
    const userMessageId = crypto.randomUUID()
    const sendingAttachments = attachments.value.map((attachment) => ({
      ...attachment,
      userId: currentUserId.value,
      messageId: userMessageId,
      conversationId: targetConversationId
    }))
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      runId,
      attachments: sendingAttachments,
      createdAt: now
    }
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      runId,
      attachments: [],
      createdAt: new Date(Date.now() + 1).toISOString(),
      streaming: true
    }
    const baseMessages = (
      sessionStore.isViewingLive(targetConversationId)
        ? sessionStore.liveMessages.filter((item) => !item.streaming)
        : messages.value
    ).map((item) => ({ ...item, streaming: false }))
    const startingStep: WorkStepRecord = {
      id: `${runId}:start`,
      userId: currentUserId.value,
      conversationId: targetConversationId,
      runId,
      title: t('ai.work.run.preparing'),
      kind: 'plan',
      status: 'in_progress',
      detail: '',
      payloadJson: '{}',
      sequence: 0,
      startedAt: now,
      completedAt: ''
    }

    inputText.value = ''
    attachments.value = []
    sessionStore.startRun({
      conversationId: targetConversationId,
      conversationTitle: displayText.slice(0, 28),
      runId,
      baseMessages,
      userMessage,
      assistantMessage,
      startingStep
    })
    nextTick(() => scrollToBottom('smooth', true))

    Promise.resolve(
      conversationRecord ? upsertWorkConversation(conversationRecord) : touchConversation(targetConversationId)
    )
      .then(() => ensureSession())
      .then(() => Promise.all([persistChatMessage(userMessage, targetConversationId), saveWorkStep(startingStep)]))
      .then(() => workService.promptSession(store.activeRuntimeId, sessionStore.sessionId, text, sendingAttachments))
      .then(async () => {
        await sessionStore.completeRun({ title: runTitle(targetConversationId) })
        await touchConversation(targetConversationId)
        await store.refreshStatus().catch(() => undefined)
        await loadHistory()
      })
      .catch(async (error) => {
        const parsed = parseWorkError(error)
        await sessionStore.failRun({
          title: runTitle(targetConversationId),
          errorText: t(parsed.key)
        })
        await touchConversation(targetConversationId).catch(() => undefined)
        workError.value = parsed
      })
  }
  const showFriendlyError = (error: unknown) => {
    workError.value = parseWorkError(error)
    window.$message?.error(t(workError.value.key))
  }
  const handleErrorAction = async () => {
    const action = workError.value?.action
    if (action === 'workspace') await chooseWorkspace()
    else if (action === 'install') await installRuntime()
    else if (action === 'settings') openSettings()
    else workError.value = null
  }
  const stopPrompt = async () => {
    if (!sessionStore.busy) return
    await sessionStore.cancelRun(store.activeRuntimeId)
    await loadHistory()
  }
  const continueWaiting = () => {
    sessionStore.touchActivity()
  }
  const regenerateMessage = (message: ChatMessage) => {
    const list = displayMessages.value
    const index = list.findIndex((item) => item.id === message.id)
    const previous = [...list.slice(0, index)].reverse().find((item) => item.role === 'user')
    if (!previous || sessionStore.busy) return
    inputText.value = previous.content
    attachments.value = previous.attachments.map((attachment) => ({
      ...attachment,
      id: crypto.randomUUID(),
      messageId: '',
      createdAt: new Date().toISOString()
    }))
    nextTick(() => inputRef.value?.focus())
  }
  const applySessionPolicy = async (
    optionId: string,
    value: string,
    preferences: Partial<{ workMode: WorkMode; approvalMode: WorkApprovalMode }>
  ) => {
    await store.savePreferences(preferences)
    if (sessionStore.sessionId) {
      await workService.setSessionConfig(store.activeRuntimeId, sessionStore.sessionId, optionId, value)
    }
    await store.refreshStatus()
  }
  const updateWorkMode = (value: WorkMode) => {
    applySessionPolicy('work_mode', value, { workMode: value }).catch(showFriendlyError)
  }
  const updateApprovalMode = (value: WorkApprovalMode) => {
    const apply = () => {
      applySessionPolicy('tool_approval', value, { approvalMode: value }).catch(showFriendlyError)
    }
    if (value !== 'yolo') {
      apply()
      return
    }
    dialog.warning({
      title: t('ai.work.policy.fullAccessTitle'),
      content: t('ai.work.policy.fullAccessDescription'),
      positiveText: t('ai.work.policy.enableFullAccess'),
      negativeText: t('common.cancel'),
      onPositiveClick: apply
    })
  }
  const onWorkbenchKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') event.preventDefault()
  }
  const onInputKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
    event.preventDefault()
    sendPrompt()
  }

  const answerPermission = (optionId?: string) => {
    sessionStore.resolvePermission(store.activeRuntimeId, optionId).catch(showFriendlyError)
  }

  watch(
    () =>
      isViewingLive.value ? sessionStore.liveMessages.map((item) => `${item.content}:${item.streaming}`).join('|') : '',
    () => {
      if (isViewingLive.value) scrollToBottom()
    }
  )

  watch(
    () => sessionStore.busy,
    (next, prev) => {
      if (prev && !next) loadHistory().catch(() => undefined)
    }
  )

  const applyAiTabPayload = async () => {
    if (applyingAiPayload) return
    const payload = homeTabStore.consumeTabPayload('ai')
    if (!payload?.conversationId) return
    applyingAiPayload = true
    try {
      if (!conversations.value.some((item) => item.id === payload.conversationId)) {
        await loadHistory()
      }
      const record = conversations.value.find((item) => item.id === payload.conversationId)
      if (record) await openConversation(record)
      else if (sessionStore.isViewingLive(payload.conversationId)) {
        conversationId.value = payload.conversationId
        activeView.value = 'chat'
        scrollToBottom('auto', true)
      }
    } finally {
      applyingAiPayload = false
    }
  }

  watch(
    () => homeTabStore.tabPayload.ai,
    () => {
      applyAiTabPayload().catch(() => undefined)
    }
  )

  onMounted(async () => {
    await sessionStore.ensureListening()
    await Promise.all([store.initialize(), loadHistory()]).catch(showFriendlyError)
    ensureNotificationPermission().catch(() => undefined)
    await applyAiTabPayload().catch(() => undefined)
    stalledTimer = setInterval(() => {
      if (sessionStore.busy && sessionStore.lastActivityAt && Date.now() - sessionStore.lastActivityAt > 45_000) {
        sessionStore.setStalled(true)
      }
    }, 3000)
  })
  onActivated(() => {
    applyAiTabPayload().catch(() => undefined)
    if (isViewingLive.value) scrollToBottom('auto', true)
  })
  onBeforeUnmount(() => {
    if (stalledTimer) clearInterval(stalledTimer)
  })
</script>

<style scoped lang="scss">
  .workbench {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--bg-primary-color);
    color: var(--text-color);
    :deep(:focus),
    :deep(:focus-visible) {
      outline: none;
      box-shadow: none;
    }
    &__body {
      flex: 1;
      display: flex;
      min-height: 0;
    }
    &__sidebar {
      flex: 0 0 246px;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 12px 10px 10px;
      border-right: 1px solid color-mix(in srgb, var(--border-color) 72%, transparent);
      background: color-mix(in srgb, var(--bg-secondary-color) 96%, var(--card-bg-color));
      box-sizing: border-box;
    }
    &__nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 0 10px;
      border-bottom: 1px solid var(--divider-color);
    }
    &__nav button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      height: 34px;
      padding: 0 10px;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--text-muted-color);
      font-size: 12px;
      cursor: pointer;
    }
    &__nav button:hover {
      background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
      color: var(--text-color);
    }
    &__nav button.active {
      border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
      background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
      color: var(--primary-color);
    }
    &__nav svg {
      width: 16px;
      height: 16px;
    }
    &__nav span {
      flex: 1;
      text-align: left;
    }
    &__history-head {
      padding: 13px 8px 6px;
      color: var(--text-muted-color);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    &__history-scroll {
      flex: 1;
      min-height: 0;
    }
    &__history-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    &__history-item {
      display: flex;
      align-items: center;
      height: 34px;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--text-muted-color);
      box-sizing: border-box;
    }
    &__history-item:hover,
    &__history-item.active {
      background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
      color: var(--text-color);
    }
    &__history-item.active {
      border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
      background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
      color: var(--primary-color);
    }
    &__history-main {
      display: flex;
      align-items: center;
      flex: 1;
      gap: 9px;
      min-width: 0;
      height: 100%;
      padding: 0 4px 0 9px;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }
    &__history-main > svg {
      flex: none;
      width: 14px;
      height: 14px;
    }
    &__history-loading {
      color: var(--primary-color);
      animation: workbench-history-spin 0.9s linear infinite;
    }
    &__history-main > strong {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
    }
    &__history-rename {
      padding-right: 8px;
      cursor: default;
      input {
        box-sizing: border-box;
        flex: 1;
        min-width: 0;
        height: 16px;
        padding: 0 4px;
        border: 1px solid color-mix(in srgb, var(--primary-color) 55%, var(--border-color));
        border-radius: 3px;
        outline: none;
        background: var(--bg-primary-color);
        color: var(--text-color);
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        line-height: 14px;
      }
    }
    &__history-more {
      display: grid;
      place-items: center;
      flex: none;
      width: 26px;
      height: 26px;
      margin-right: 3px;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      opacity: 0;
      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
      svg {
        width: 13px;
        height: 13px;
      }
    }
    &__history-item:hover &__history-more,
    &__history-item.active &__history-more {
      opacity: 1;
    }
    &__history-more--spacer {
      visibility: hidden;
      pointer-events: none;
      opacity: 1;
    }
    &__history-empty {
      padding: 16px 8px;
      color: var(--text-muted-color);
      font-size: 11px;
      text-align: center;
    }
    &__workspace-slot {
      flex: 0 0 57px;
      display: flex;
      align-items: flex-end;
      min-height: 57px;
    }
    &__workspace {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
      margin-top: 8px;
      padding: 9px 8px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--card-bg-color);
      color: var(--text-color);
      cursor: pointer;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
    }
    &__workspace-icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--bg-muted-color);
      color: var(--primary-color);
    }
    &__workspace-icon svg {
      width: 15px;
      height: 15px;
    }
    &__workspace > span:nth-child(2) {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
    }
    &__workspace small {
      color: var(--text-muted-color);
      font-size: 9px;
    }
    &__workspace strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
    }
    &__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      background: var(--bg-content-color);
    }
    &__page-scroll {
      flex: 1;
      min-height: 0;
    }
    &__topbar {
      position: relative;
      flex: 0 0 48px;
      display: flex;
      align-items: center;
      padding: 0 16px;
      border-bottom: 1px solid var(--divider-color);
      background: color-mix(in srgb, var(--bg-primary-color) 94%, var(--card-bg-color));
      &--locked &__session-title {
        max-width: calc(100% - 160px);
      }
    }
    &__session-title {
      z-index: 1;
      min-width: 0;
      max-width: calc(50% - 120px);
    }
    &__session-title strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
    }
    &__scope-switch {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      gap: 4px;
      padding: 3px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-secondary-color);
    }
    &__scope-switch button {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 28px;
      padding: 0 10px;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--text-secondary-color);
      font-size: 11px;
      box-sizing: border-box;
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        color 0.15s ease;
    }
    &__scope-switch button:hover {
      background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
      color: var(--text-color);
    }
    &__scope-switch button.active {
      border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
      background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
      color: var(--primary-color);
    }
    &__scope-switch svg {
      width: 13px;
      height: 13px;
    }
    &__scope-badge {
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-left: auto;
      height: 28px;
      padding: 0 10px;
      border: 1px solid color-mix(in srgb, var(--primary-color) 60%, transparent);
      border-radius: 7px;
      background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
      color: var(--primary-color);
      font-size: 11px;
      box-sizing: border-box;
      svg {
        width: 13px;
        height: 13px;
        flex: none;
      }
    }
    &__chat-layout {
      flex: 1;
      display: flex;
      min-height: 0;
    }
    &__chat {
      position: relative;
      flex: 1;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-width: 0;
      min-height: 0;
      background: var(--bg-content-color);
    }
    &__welcome {
      display: flex;
      min-height: 0;
      flex-direction: column;
      align-items: center;
      justify-content: safe center;
      width: min(720px, calc(100% - 48px));
      margin: 0 auto;
      padding: 24px 0;
      overflow-y: auto;
      box-sizing: border-box;
    }
    &__welcome-mark {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      margin-bottom: 14px;
      overflow: hidden;
      border-radius: 15px;
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
    }
    &__welcome h1 {
      margin: 0;
      font-size: 23px;
      font-weight: 650;
    }
    &__welcome > p {
      margin: 7px 0 20px;
      color: var(--text-secondary-color);
      font-size: 12px;
    }
    &__setup-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      width: 100%;
      margin-bottom: 14px;
      padding: 14px 16px;
      border: 1px solid color-mix(in srgb, var(--yellow) 18%, var(--border-color));
      border-radius: 10px;
      background: color-mix(in srgb, var(--yellow) 9%, var(--bg-primary-color));
      box-sizing: border-box;
    }
    &__setup-card > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    &__setup-card strong {
      font-size: 12px;
    }
    &__setup-card span {
      color: var(--text-secondary-color);
      font-size: 10px;
    }
    &__quick-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      width: 100%;
    }
    &__quick-grid > button {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 9px;
      background: var(--content-card-bg);
      color: var(--text-color);
      cursor: pointer;
      text-align: left;
      transition:
        border-color 0.15s ease,
        transform 0.15s ease;
    }
    &__quick-grid > button:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--primary-color) 40%, var(--border-color));
    }
    &__quick-icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 34px;
      height: 34px;
      overflow: hidden;
      border-radius: 0;
      background: transparent;
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }
    }
    &__quick-grid > button > span:nth-child(2) {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
      gap: 3px;
    }
    &__quick-grid strong {
      font-size: 11px;
    }
    &__quick-grid small {
      overflow: hidden;
      color: var(--text-muted-color);
      font-size: 9px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__quick-arrow {
      width: 13px;
      height: 13px;
      color: var(--text-muted-color);
    }
    &__messages-scroll {
      flex: 1;
      min-height: 0;
    }
    &__scroll-bottom {
      position: absolute;
      z-index: 4;
      right: clamp(20px, 8%, 86px);
      bottom: 126px;
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: 1px solid var(--border-color);
      border-radius: 50%;
      background: var(--bg-muted-color);
      color: var(--text-secondary-color);
      box-shadow: 0 4px 14px color-mix(in srgb, var(--border-color) 38%, transparent);
      cursor: pointer;
    }
    &__scroll-bottom svg {
      width: 13px;
      height: 13px;
      transform: rotate(-90deg);
    }
    &__messages {
      width: 100%;
      padding: 20px 0;
    }
    &__composer-wrap {
      z-index: 2;
      min-width: 0;
      padding: 8px clamp(12px, 7%, 72px) 7px;
      border-top: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
      background: var(--bg-primary-color);
    }
    &__error-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      max-width: 820px;
      margin: 0 auto 7px;
      padding: 8px 10px;
      border: 1px solid color-mix(in srgb, var(--yellow) 20%, var(--border-color));
      border-radius: 8px;
      background: color-mix(in srgb, var(--yellow) 10%, var(--bg-primary-color));
      color: var(--text-secondary-color);
      font-size: 10px;
    }
    &__error-card span {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }
    &__error-card svg {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--yellow);
    }
    &__error-card button {
      flex: none;
      border: 0;
      background: transparent;
      color: var(--primary-color);
      font-size: 10px;
      cursor: pointer;
    }
    &__composer {
      max-width: 820px;
      margin: 0 auto;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
      border-radius: 12px;
      background: var(--input-soft-bg);
      box-shadow: 0 8px 30px color-mix(in srgb, var(--border-color) 28%, transparent);
    }
    &__composer textarea {
      display: block;
      width: 100%;
      min-height: 58px;
      max-height: 160px;
      resize: none;
      padding: 13px 14px 5px;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--text-color);
      font: inherit;
      font-size: 12px;
      line-height: 1.55;
      box-sizing: border-box;
    }
    &__composer textarea::placeholder {
      color: var(--text-muted-color);
    }
    &__composer-attachments {
      padding: 4px 10px 6px;
    }
    &__composer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 7px 7px;
    }
    &__composer-bar > div {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }
    &__composer-bar > div > button {
      display: grid;
      place-items: center;
      width: 27px;
      height: 27px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      &:hover {
        background: var(--bg-muted-color);
        color: var(--text-color);
      }
    }
    &__composer-bar svg {
      width: 15px;
      height: 15px;
    }
    &__composer-bar > div > span {
      max-width: 180px;
      margin-left: 3px;
      overflow: hidden;
      color: var(--text-muted-color);
      font-size: 9px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__send,
    &__stop {
      display: grid;
      place-items: center;
      width: 29px;
      height: 29px;
      border: 0;
      border-radius: 8px;
      background: var(--primary-color);
      color: var(--text-on-primary-color);
      cursor: pointer;
    }
    &__send:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }
    &__stop i {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      background: currentColor;
    }
    &__input-hint {
      display: block;
      max-width: 820px;
      margin: 5px auto 0;
      color: var(--text-muted-color);
      font-size: 9px;
      text-align: center;
    }
    &__activity {
      flex: 0 0 270px;
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-left: 1px solid var(--divider-color);
      background: var(--bg-secondary-color);
    }
    &__activity > header {
      display: flex;
      justify-content: space-between;
      padding: 14px;
      border-bottom: 1px solid var(--divider-color);
    }
    &__activity > header strong {
      font-size: 11px;
    }
    &__activity > header span {
      color: var(--primary-color);
      font-size: 9px;
    }
    &__activity :deep(.n-scrollbar-content) {
      padding: 13px;
    }
    &__activity-label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-muted-color);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    &__plan {
      padding-bottom: 14px;
      border-bottom: 1px solid var(--divider-color);
    }
    &__plan > div {
      display: flex;
      gap: 8px;
      padding: 5px 0;
      color: var(--text-secondary-color);
      font-size: 10px;
    }
    &__plan i {
      flex: none;
      width: 7px;
      height: 7px;
      margin-top: 3px;
      border: 1px solid var(--text-muted-color);
      border-radius: 50%;
    }
    &__plan .completed i {
      border-color: var(--primary-color);
      background: var(--primary-color);
    }
    &__plan .in_progress i {
      border-color: var(--primary-color);
      box-shadow: inset 0 0 0 2px var(--bg-secondary-color);
      background: var(--primary-color);
    }
    &__tools {
      padding-top: 13px;
    }
    &__tools article {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      margin-bottom: 5px;
      border: 1px solid var(--border-color);
      border-radius: 7px;
      background: var(--card-bg-color);
    }
    &__tool-icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 27px;
      height: 27px;
      border-radius: 6px;
      background: var(--bg-muted-color);
      color: var(--primary-color);
    }
    &__tool-icon svg {
      width: 14px;
      height: 14px;
    }
    &__tools article > div {
      display: flex;
      flex: 1;
      min-width: 0;
      flex-direction: column;
    }
    &__tools strong,
    &__tools small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__tools strong {
      font-size: 10px;
    }
    &__tools small {
      margin-top: 2px;
      color: var(--text-muted-color);
      font-size: 8px;
    }
    &__tools article > i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--text-muted-color);
    }
    &__tools article > i.completed {
      background: var(--primary-color);
    }
    &__tools article > i.in_progress {
      background: var(--primary-color);
      box-shadow: 0 0 7px color-mix(in srgb, var(--primary-color) 60%, transparent);
    }
    @media (max-width: 1080px) {
      &__activity {
        display: none;
      }
      &__sidebar {
        flex-basis: 220px;
      }
    }
    @media (max-width: 860px) {
      &__sidebar {
        flex-basis: 190px;
      }
      &__topbar {
        padding: 0 10px;
      }
      &__session-title {
        max-width: calc(50% - 100px);
      }
      &__welcome {
        width: calc(100% - 28px);
        padding: 16px 0;
      }
      &__quick-grid {
        grid-template-columns: 1fr;
      }
      &__composer-wrap {
        padding-inline: 10px;
      }
    }
    @media (max-height: 650px) {
      &__welcome-mark {
        width: 40px;
        height: 40px;
        margin-bottom: 8px;
      }
      &__welcome h1 {
        font-size: 19px;
      }
      &__welcome > p {
        margin: 4px 0 10px;
      }
      &__quick-grid > button {
        padding: 9px;
      }
      &__composer textarea {
        min-height: 44px;
        max-height: 100px;
      }
    }
  }

  @keyframes workbench-history-spin {
    to {
      transform: rotate(360deg);
    }
  }

  :global(.n-dropdown-menu .workbench-history-menu__danger) {
    color: var(--red);
  }
  :global(.n-dropdown-menu .workbench-history-menu__danger:hover) {
    color: var(--red) !important;
  }
</style>
