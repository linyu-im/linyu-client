<template>
  <div class="chat-session">
    <!-- 相关用户信息 -->
    <div class="chat-session__header" @click="onHeaderClick">
      <ChatSessionPeerInfo
        ref="peerInfoRef"
        class="chat-session__header-info"
        :peer-id="props.chat.peerId"
        :scene-type="props.chat.sceneType ?? SceneType.User" />
      <div class="chat-session__header-actions" @click.stop>
        <SvgIconButton href="#record" @click="onOpenChatRecord" />
        <SvgIconButton href="#more" :active="settingsDrawerVisible" @click="onMoreClick" />
      </div>
    </div>
    <div class="chat-session__body">
      <Split
        class="chat-session__split"
        direction="vertical"
        fixed="second"
        :min-size="180"
        :max-size="440"
        :default-size="220">
        <template #first>
          <div class="chat-session__content">
            <MessageList
              ref="messageListRef"
              :messages="messages"
              :loading="loading"
              :loading-more="loadingMore"
              :has-more="hasMore"
              @reach-top="onLoadMore"
              @at-bottom-change="onAtBottomChange"
              @forward="onForwardMessage" />
            <button v-if="pendingNewCount > 0" type="button" class="chat-session__new-msg" @click="scrollToLatest">
              {{ t('message.newMessages', { count: pendingNewCount }) }}
            </button>
          </div>
        </template>
        <template #second>
          <div class="chat-session__input">
            <div class="flex-1 flex w-full min-h-0">
              <MessageEditor
                ref="editorRef"
                v-model="draft"
                :fetch-mentions="onFetchMentions"
                @submit="onSend"
                @file-rejected="onFileRejected" />
            </div>
            <div class="flex w-full items-center justify-between m-t-10px gap-8px">
              <div class="flex items-center gap-5px flex-1 min-w-0">
                <n-popover
                  v-model:show="emojiPickerVisible"
                  trigger="click"
                  placement="top-start"
                  display-directive="show"
                  :animated="false"
                  :duration="0"
                  :show-arrow="false"
                  raw
                  :z-index="2000">
                  <template #trigger>
                    <SvgIconButton href="#emotion" :active="emojiPickerVisible" />
                  </template>
                  <EmojiPicker :visible="emojiPickerVisible" @select="onEmojiSelect" />
                </n-popover>
                <SvgIconButton href="#scissor" @click="openAndFocusWindow('screenshot')" />
                <SvgIconButton href="#folder" @click="onPickFiles" />
                <SvgIconButton href="#image" @click="onPickImages" />
                <SvgIconButton href="#microphone" :active="voiceRecordingVisible" @click="onToggleVoiceRecording" />
                <VoiceRecordBar
                  v-if="voiceRecordingVisible"
                  class="chat-session__voice-bar"
                  :duration="voiceDurationSec"
                  :max-duration="VOICE_RECORD_MAX_DURATION"
                  :warn-remaining="VOICE_RECORD_WARN_REMAINING"
                  :sending="voiceSending"
                  @cancel="onVoiceRecordCancel"
                  @send="onVoiceRecordSend" />
              </div>
              <div v-if="!voiceRecordingVisible" class="flex items-center gap-5px">
                <SvgIconButton href="#phone" />
                <SvgIconButton href="#video" />
                <n-button size="tiny" type="primary" class="w-56px m-l-10px p-y-12px" @click="onSend()">
                  {{ t('message.editor.send') }}
                </n-button>
              </div>
            </div>
          </div>
        </template>
      </Split>
      <ChatSessionSettingsDrawer
        :show="settingsDrawerVisible"
        :chat-id="props.chat.id"
        :scene-type="props.chat.sceneType ?? SceneType.User"
        :user-info="peerInfo"
        :group-info="groupInfo"
        @close="settingsDrawerVisible = false"
        @history-deleted="onChatHistoryDeleted" />
      <ForwardMessageModal />
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { messageApi, robotApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import { useUserStore } from '@/stores/user'
  import { useChatStore } from '@/stores/chat'
  import { useMessageDbStore } from '@/stores/messageDb'
  import type { Chat } from '@/types/api/chat'
  import type { Message, SendMessageContent, SendMessageMsgType, SendMessageParam } from '@/types/api/message'
  import { buildSendParam, buildSendUnitsFromSegments, unitNeedsMediaUpload } from '@/utils/editorMessage'
  import {
    createLocalMessage,
    createLocalMessageFromUnit,
    isStalePendingLocalMessage,
    mergeReplacedServerMessage,
    patchMessageById,
    resolveMessageFailReason
  } from '@/utils/messageSend'
  import { useMessageUploadStore } from '@/stores/messageUpload'
  import { useMessageForwardStore } from '@/stores/messageForward'
  import { useSendingMessagesStore } from '@/stores/sendingMessages'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import MessageEditor, { type EditorPayload } from '../Message/MessageEditor/index.vue'
  import type { MentionItem } from '../Message/MessageEditor/MentionList.vue'
  import MessageList from '../Message/MessageList/index.vue'
  import ForwardMessageModal from '../Message/ForwardMessageModal.vue'
  import EmojiPicker from '../Message/EmojiPicker/index.vue'
  import VoiceRecordBar from '../Message/VoiceRecordBar.vue'
  import ChatSessionSettingsDrawer from './ChatSessionSettingsDrawer/index.vue'
  import ChatSessionPeerInfo from './ChatSessionPeerInfo.vue'
  import type { Sticker } from '@/types/api/sticker'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import {
    buildVoiceFileName,
    useVoiceRecorder,
    VOICE_RECORD_MAX_DURATION,
    VOICE_RECORD_WARN_REMAINING
  } from '@/composables/useVoiceRecorder'
  import { IMAGE_FILE_EXTENSIONS, pickFiles } from '@/utils/filePick'
  import { uploadMessageMediaBlob } from '@/utils/messageMediaUpload'
  import { resolveMessageStorageRoot, stageSelfSentToStorage } from '@/utils/messageFileSave'
  import { FILE_MESSAGE_STATUS_DOWNLOADED } from '@/utils/messageLocalExt'
  import { isValidBackendTime, parseBackendTime } from '@/utils/time'
  import { openChatRecord } from '@/utils/chatRecord'
  import { openAndFocusWindow } from '@/utils/window.ts'

  const props = defineProps<{
    chat: Chat
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()
  const chatStore = useChatStore()
  const messageDbStore = useMessageDbStore()
  const messageUploadStore = useMessageUploadStore()
  const messageForwardStore = useMessageForwardStore()
  const sendingMessagesStore = useSendingMessagesStore()
  const appSettingsStore = useAppSettingsStore()

  const PAGE_SIZE = 20
  const pendingNewCount = ref(0)
  const messages = ref<Message[]>([])
  const page = ref(0)
  const hasMore = ref(false)
  const loading = ref(false)
  const loadingMore = ref(false)

  const draft = ref('')
  const emojiPickerVisible = ref(false)
  const voiceRecordingVisible = ref(false)
  const voiceSending = ref(false)
  const {
    durationSec: voiceDurationSec,
    start: startVoiceRecord,
    stop: stopVoiceRecord,
    cancel: cancelVoiceRecord
  } = useVoiceRecorder()

  let voiceMaxDurationHandled = false

  const resetVoiceRecordLimitState = () => {
    voiceMaxDurationHandled = false
  }

  watch(
    voiceDurationSec,
    (sec) => {
      if (!voiceRecordingVisible.value || voiceSending.value || voiceMaxDurationHandled) return

      if (sec >= VOICE_RECORD_MAX_DURATION) {
        voiceMaxDurationHandled = true
        onVoiceRecordCancel()
      }
    },
    { flush: 'sync' }
  )

  const editorRef = ref<InstanceType<typeof MessageEditor> | null>(null)
  const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)
  const peerInfoRef = ref<InstanceType<typeof ChatSessionPeerInfo> | null>(null)
  const peerInfo = computed(() => peerInfoRef.value?.userInfo ?? null)
  const groupInfo = computed(() => peerInfoRef.value?.groupInfo ?? null)
  const settingsDrawerVisible = ref(false)

  const onHeaderClick = () => {
    if (settingsDrawerVisible.value) {
      settingsDrawerVisible.value = false
    }
  }

  const onMoreClick = () => {
    settingsDrawerVisible.value = !settingsDrawerVisible.value
  }

  const onOpenChatRecord = () => {
    openChatRecord(props.chat)
  }

  const onForwardMessage = (message: Message) => {
    messageForwardStore.open(message)
  }

  const onChatHistoryDeleted = () => {
    loadInitialMessages()
  }

  useEscapeOverlay(() => {
    emojiPickerVisible.value = false
  }, emojiPickerVisible)

  useEscapeOverlay(() => {
    onVoiceRecordCancel()
  }, voiceRecordingVisible)

  useEscapeOverlay(() => {
    settingsDrawerVisible.value = false
  }, settingsDrawerVisible)

  const normalizeMessage = (raw: Message): Message => {
    return {
      ...raw,
      fromType: raw.fromType || 'user'
    }
  }

  const toDisplayOrder = (records: Message[]) => records.slice().reverse()

  const getMessageSortTime = (msg: Message) => {
    for (const timeStr of [msg.createdAt, msg.updatedAt]) {
      if (isValidBackendTime(timeStr)) {
        return parseBackendTime(timeStr!).getTime()
      }
    }
    return 0
  }

  const sortMessagesByTime = (list: Message[]) => {
    return [...list].sort((a, b) => {
      const diff = getMessageSortTime(a) - getMessageSortTime(b)
      return diff !== 0 ? diff : a.id.localeCompare(b.id)
    })
  }

  const mergeMessages = (incoming: Message[], existing: Message[]) => {
    const older = toDisplayOrder(incoming)
    const map = new Map<string, Message>()
    for (const msg of [...older, ...existing]) {
      map.set(msg.id, msg)
    }
    return sortMessagesByTime([...map.values()])
  }

  const isSelfMessage = (msg: Message) => {
    const uid = userStore.authInfo.userId
    return !!uid && msg.fromId === uid
  }

  const isPeerMessage = (msg: Message) => msg.fromId === props.chat.peerId

  const onAtBottomChange = (atBottom: boolean) => {
    if (atBottom) pendingNewCount.value = 0
  }

  const scrollToLatest = () => {
    pendingNewCount.value = 0
    messageListRef.value?.scrollToBottom()
  }

  /** 追加实时消息；自己发送或已在底部时自动滚到底部，否则累计新消息提示 */
  const appendMessage = (raw: Message) => {
    const msg = normalizeMessage(raw as Message)
    if (messages.value.some((item) => item.id === msg.id)) return

    const atBottom = messageListRef.value?.isAtBottom() ?? false
    const fromSelf = isSelfMessage(msg)
    const fromPeer = isPeerMessage(msg)

    messages.value = [...messages.value, msg]

    nextTick(() => {
      if (fromSelf || atBottom) {
        messageListRef.value?.scrollToBottom()
        pendingNewCount.value = 0
      } else if (fromPeer) {
        pendingNewCount.value += 1
      }
    })
  }

  let loadSeq = 0

  const fetchMessagePage = async (targetPage: number) => {
    const result = await messageDbStore.loadMessagesFromDb(props.chat.sessionId, targetPage, PAGE_SIZE)

    const records = result.records.map((item) => normalizeMessage(item as Message))
    return {
      records,
      page: result.page,
      hasMore: result.hasMore
    }
  }

  const loadInitialMessages = async () => {
    const seq = ++loadSeq
    const { peerId } = props.chat

    page.value = 0
    hasMore.value = false
    pendingNewCount.value = 0
    loading.value = true

    try {
      const result = await fetchMessagePage(1)
      if (seq !== loadSeq || !result) return

      const serverMessages = toDisplayOrder(result.records)
      const pendingMessages = sendingMessagesStore.getMessages(peerId)
      const serverIds = new Set(serverMessages.map((m) => m.id))
      const uniquePending = pendingMessages.filter((m) => {
        if (m.status !== 'sending' || serverIds.has(m.id)) return false
        if (isStalePendingLocalMessage(m, serverMessages)) {
          sendingMessagesStore.removeMessage(peerId, m.id)
          return false
        }
        return true
      })

      messages.value = sortMessagesByTime([...serverMessages, ...uniquePending])
      page.value = result.page
      hasMore.value = result.hasMore
    } finally {
      if (seq === loadSeq) {
        loading.value = false
        nextTick(() => messageListRef.value?.scrollToBottom())
      }
    }
  }

  const onLoadMore = async () => {
    if (loading.value || loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    try {
      const result = await fetchMessagePage(page.value + 1)
      if (!result) return

      messages.value = mergeMessages(result.records, messages.value)
      page.value = result.page
      hasMore.value = result.hasMore
    } finally {
      loadingMore.value = false
    }
  }

  watch(
    () => props.chat.id,
    () => {
      settingsDrawerVisible.value = false
      emojiPickerVisible.value = false
      draft.value = ''
      editorRef.value?.clear()

      if (voiceRecordingVisible.value) {
        cancelVoiceRecord()
        voiceSending.value = false
        voiceRecordingVisible.value = false
        resetVoiceRecordLimitState()
      }

      loadInitialMessages()
    },
    { immediate: true }
  )

  watch(
    () => chatStore.reopenTick,
    () => {
      settingsDrawerVisible.value = false
    }
  )

  defineExpose({ appendMessage, reloadMessages: loadInitialMessages })

  const mentionableRobots = ref<MentionItem[]>([])

  const loadMentionableRobots = () => {
    robotApi.listRobots().then((res) => {
      if (res.code === 0 && res.data) {
        mentionableRobots.value = res.data.map((robot) => ({
          id: robot.id,
          name: robot.robotName,
          type: 'robot' as const,
          tag: t('message.robotTag')
        }))
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onFetchMentions = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return mentionableRobots.value
    return mentionableRobots.value.filter((item) => item.name.toLowerCase().includes(q))
  }

  loadMentionableRobots()

  const replaceLocalMessage = (localId: string, serverMsg: Message, peerId: string): Promise<void> => {
    messageUploadStore.clearProgress(localId)
    sendingMessagesStore.removeMessage(peerId, localId)
    const localMsg = messages.value.find((item) => item.id === localId)
    const normalized = normalizeMessage(mergeReplacedServerMessage(serverMsg, localMsg))
    if (localMsg) {
      messages.value = messages.value.map((item) => (item.id === localId ? normalized : item))
    }
    if (localId.startsWith('local-')) {
      return messageDbStore.replaceLocalWithServer(localId, normalized)
    }
    return messageDbStore.saveMessages([normalized])
  }

  const markLocalMessageFailed = (localId: string, reason: string, peerId: string, sessionId: string) => {
    messageUploadStore.clearProgress(localId)
    sendingMessagesStore.updateMessage(peerId, localId, {
      status: 'failed',
      failReason: reason
    })
    messages.value = patchMessageById(messages.value, localId, {
      status: 'failed',
      failReason: reason
    })

    const failedMsg = messages.value.find((item) => item.id === localId)
    if (!failedMsg) return

    const msgToSave = {
      ...failedMsg,
      sessionId: failedMsg.sessionId || sessionId,
      status: 'failed' as const,
      failReason: reason
    }
    void messageDbStore.saveMessages([msgToSave]).then(() => {
      sendingMessagesStore.removeMessage(peerId, localId)
    })
  }

  type SendContext = {
    fromId: string
    toId: string
    sessionId: string
    sceneType: SceneType
  }

  const getSendContext = (): SendContext | null => {
    const fromId = userStore.authInfo.userId
    if (!fromId) return null
    return {
      fromId,
      toId: props.chat.peerId,
      sessionId: props.chat.sessionId,
      sceneType: props.chat.sceneType ?? SceneType.User
    }
  }

  const stageLocalMessage = (message: Message) => {
    appendMessage(message)
    sendingMessagesStore.addMessage(props.chat.peerId, message)
    return message
  }

  const replaceForwardMessageInUi = (localId: string, serverMsg: Message) => {
    const normalized = normalizeMessage({
      ...serverMsg,
      sessionId: serverMsg.sessionId || messages.value.find((item) => item.id === localId)?.sessionId || ''
    })
    if (messages.value.some((item) => item.id === localId)) {
      messages.value = messages.value.map((item) => (item.id === localId ? normalized : item))
    }
  }

  const markForwardFailedInUi = (localId: string, message: Message) => {
    messages.value = patchMessageById(messages.value, localId, {
      status: message.status,
      failReason: message.failReason
    })
  }

  watch(
    () => messageForwardStore.syncSeq,
    () => {
      const payload = messageForwardStore.syncPayload
      if (!payload || payload.sessionId !== props.chat.sessionId) return

      const { message, replaceLocalId } = payload
      if (replaceLocalId) {
        replaceForwardMessageInUi(replaceLocalId, message)
        return
      }
      if (messages.value.some((item) => item.id === message.id)) {
        markForwardFailedInUi(message.id, message)
        return
      }
      appendMessage(message)
    }
  )

  const createAndStageLocalMessage = (msgType: SendMessageMsgType, content: SendMessageContent): Message | null => {
    const ctx = getSendContext()
    if (!ctx) return null
    return stageLocalMessage({
      ...createLocalMessage(msgType, content, ctx.fromId, ctx.toId, ctx.sceneType),
      sessionId: ctx.sessionId
    })
  }

  const createAndStageLocalMessageFromUnit = (
    unit: ReturnType<typeof buildSendUnitsFromSegments>[number]
  ): Message | null => {
    const ctx = getSendContext()
    if (!ctx) return null
    return stageLocalMessage({
      ...createLocalMessageFromUnit(unit, ctx.fromId, ctx.toId, ctx.sceneType),
      sessionId: ctx.sessionId
    })
  }

  const dispatchSendMessage = (
    localId: string,
    param: SendMessageParam,
    peerId: string,
    sessionId: string
  ): Promise<string | undefined> => {
    return messageApi
      .sendMsg(param)
      .then((res) => {
        if (res.code === 0 && res.data) {
          return replaceLocalMessage(localId, res.data, peerId).then(() => res.data!.id)
        }
        markLocalMessageFailed(localId, resolveMessageFailReason(res.code, res.msg, t), peerId, sessionId)
        return undefined
      })
      .catch(() => {
        markLocalMessageFailed(localId, t('message.sendStatus.network'), peerId, sessionId)
        return undefined
      })
  }

  const sendLocalMessage = (
    localId: string,
    unit: ReturnType<typeof buildSendUnitsFromSegments>[number],
    peerId: string,
    sessionId: string
  ): Promise<string | undefined> => {
    if (unitNeedsMediaUpload(unit)) {
      messageUploadStore.setProgress(localId, 0)
    }

    const onProgress = (progress: number) => {
      messageUploadStore.setProgress(localId, progress)
    }

    return buildSendParam(unit, sessionId, { onProgress })
      .then((param) => {
        messageUploadStore.clearProgress(localId)
        if (!param) {
          markLocalMessageFailed(localId, t('message.sendStatus.uploadFailed'), peerId, sessionId)
          return undefined
        }

        return dispatchSendMessage(localId, param, peerId, sessionId)
      })
      .catch(() => {
        messageUploadStore.clearProgress(localId)
        markLocalMessageFailed(localId, t('message.sendStatus.network'), peerId, sessionId)
        return undefined
      })
  }

  type SelfStagedFileUnit = Extract<ReturnType<typeof buildSendUnitsFromSegments>[number], { msgType: 'file' }>

  const persistSelfSentFileLocalExt = (serverMessageId: string, localPath: string) => {
    const localExt = { status: FILE_MESSAGE_STATUS_DOWNLOADED, localPath }
    messages.value = patchMessageById(messages.value, serverMessageId, { localExt })
    return messageDbStore.updateFileMessageLocalExt(serverMessageId, localExt)
  }

  const sendSelfFileMessage = (localId: string, unit: SelfStagedFileUnit, peerId: string, sessionId: string) => {
    return resolveMessageStorageRoot(appSettingsStore.storage.path)
      .then((storageRoot) =>
        stageSelfSentToStorage({
          storageRoot,
          category: 'file',
          sourceUrl: unit.content.fileUrl,
          fileName: unit.content.fileName
        })
      )
      .catch(() => {
        return null
      })
      .then((localPath) =>
        sendLocalMessage(localId, unit, peerId, sessionId).then((serverMessageId) => {
          if (!serverMessageId || !localPath) return
          return persistSelfSentFileLocalExt(serverMessageId, localPath)
        })
      )
  }

  const sendRobotAnswers = (
    unit: Extract<ReturnType<typeof buildSendUnitsFromSegments>[number], { msgType: 'text' }>
  ) => {
    if (!props.chat.peerId) return []

    const question = unit.content.text.trim()
    if (!question) return []

    const removeStreamPlaceholder = (streamId: string) => {
      messages.value = messages.value.filter((item) => item.id !== streamId)
    }

    const resolveStreamDone = (streamId: string, raw: Message, streamStarted: boolean) => {
      const msg = normalizeMessage(raw as Message)
      if (messages.value.some((item) => item.id === msg.id)) {
        if (streamStarted) removeStreamPlaceholder(streamId)
        return
      }
      if (streamStarted) {
        messages.value = messages.value.map((item) => (item.id === streamId ? msg : item))
        return
      }
      appendMessage(msg)
    }

    const syncStreamScroll = (followScroll: { active: boolean }) => {
      const atBottom = messageListRef.value?.isAtBottom() ?? false
      if (!followScroll.active && atBottom) {
        followScroll.active = true
      } else if (followScroll.active && !atBottom) {
        followScroll.active = false
        return
      }
      if (followScroll.active) {
        nextTick(() => scrollToLatest())
      }
    }

    return unit.mentions
      .filter((mention) => mention.mentionType === 'robot')
      .map((mention) => {
        const streamId = `robot-stream-${mention.id}-${Date.now()}`
        let streamStarted = false
        let accumulated = ''
        const followScroll = { active: false }

        return robotApi
          .answersStream(
            {
              peerId: props.chat.peerId,
              robotId: mention.id,
              question,
              sceneType: props.chat.sceneType ?? SceneType.User
            },
            {
              onDelta: (content) => {
                accumulated += content
                if (!streamStarted) {
                  streamStarted = true
                  appendMessage({
                    id: streamId,
                    sessionId: '',
                    fromId: mention.id,
                    toId: props.chat.peerId,
                    msgType: 'text',
                    content: { text: accumulated },
                    fromType: 'robot',
                    isShowTime: false,
                    sceneType: props.chat.sceneType ?? SceneType.User,
                    createdAt: '',
                    updatedAt: ''
                  })
                  nextTick(() => {
                    followScroll.active = messageListRef.value?.isAtBottom() ?? false
                  })
                  return
                }
                messages.value = patchMessageById(messages.value, streamId, {
                  content: { text: accumulated }
                })
                syncStreamScroll(followScroll)
              },
              onDone: (raw) => {
                resolveStreamDone(streamId, raw, streamStarted)
                syncStreamScroll(followScroll)
              },
              onError: (msg) => {
                window.$message.error(msg)
                if (streamStarted) removeStreamPlaceholder(streamId)
              }
            }
          )
          .catch((error: unknown) => {
            const msg = error instanceof Error ? error.message : String(error)
            window.$message.error(msg)
            if (streamStarted) removeStreamPlaceholder(streamId)
          })
      })
  }

  const onSend = (payload?: EditorPayload) => {
    if (!editorRef.value) return
    if (!payload) {
      editorRef.value.submit()
      return
    }

    if (payload.isEmpty) return

    const sendCtx = getSendContext()
    if (!sendCtx) return

    const units = buildSendUnitsFromSegments(payload.segments)
    if (!units.length) return

    const localMessages: Message[] = []
    for (const unit of units) {
      const localMsg = createAndStageLocalMessageFromUnit(unit)
      if (!localMsg) return
      localMessages.push(localMsg)
    }

    editorRef.value.clear({ keepBlobs: true })

    const { toId: peerId, sessionId } = sendCtx
    const sendTasks = units.flatMap((unit, index) => {
      const localId = localMessages[index].id
      if (unit.msgType === 'file') {
        return [sendSelfFileMessage(localId, unit, peerId, sessionId)]
      }
      const tasks: Promise<void | undefined>[] = [
        sendLocalMessage(localId, unit, peerId, sessionId).then(() => undefined)
      ]
      if (unit.msgType === 'text') {
        tasks.push(...sendRobotAnswers(unit))
      }
      return tasks
    })

    Promise.all(sendTasks).then(() => {
      editorRef.value?.clear()
    })
  }

  const onFileRejected = ({ file, reason }: { file: File; reason: string }) => {
    const tip = reason === 'image-too-large' ? t('message.editor.imageTooLarge') : t('message.editor.fileTooLarge')
    window.$message?.warning(`${tip}：${file.name}`)
  }

  const insertPickedFiles = (files: File[], mode: 'image' | 'file') => {
    if (!files.length || !editorRef.value) return
    for (const file of files) {
      if (mode === 'image') {
        editorRef.value.insertImage(file)
      } else {
        editorRef.value.insertFile(file)
      }
    }
    editorRef.value.focus()
  }

  const onPickImages = () => {
    pickFiles({
      title: t('message.editor.pickImage'),
      multiple: true,
      filters: [{ name: 'Images', extensions: IMAGE_FILE_EXTENSIONS }]
    })
      .then((files) => insertPickedFiles(files, 'image'))
      .catch(() => {
        window.$message?.error(t('message.editor.pickFailed'))
      })
  }

  const onPickFiles = () => {
    pickFiles({
      title: t('message.editor.pickFile'),
      multiple: true,
      filters: [{ name: 'All Files', extensions: ['*'] }]
    })
      .then((files) => insertPickedFiles(files, 'file'))
      .catch(() => {
        window.$message?.error(t('message.editor.pickFailed'))
      })
  }

  const onToggleVoiceRecording = () => {
    if (voiceRecordingVisible.value) {
      onVoiceRecordCancel()
      return
    }

    startVoiceRecord()
      .then(() => {
        resetVoiceRecordLimitState()
        voiceRecordingVisible.value = true
      })
      .catch(() => {
        window.$message?.error(t('message.voiceRecord.startFailed'))
      })
  }

  const onVoiceRecordCancel = () => {
    cancelVoiceRecord()
    voiceSending.value = false
    voiceRecordingVisible.value = false
    resetVoiceRecordLimitState()
  }

  const onVoiceRecordSend = () => {
    if (voiceSending.value) return

    voiceSending.value = true
    stopVoiceRecord()
      .then((result) => {
        if (!result) {
          window.$message?.warning(t('message.voiceRecord.tooShort'))
          voiceSending.value = false
          onVoiceRecordCancel()
          return
        }

        const fileName = buildVoiceFileName(result.mimeType)
        return uploadMessageMediaBlob(result.blob, fileName).then((voiceUrl) => {
          if (!voiceUrl) {
            window.$message?.error(t('message.voiceRecord.uploadFailed'))
            voiceSending.value = false
            onVoiceRecordCancel()
            return
          }

          const voiceContent = {
            voiceUrl,
            voiceDuration: String(result.durationSec)
          }
          const localMsg = createAndStageLocalMessage('voice', voiceContent)
          if (!localMsg) {
            voiceSending.value = false
            onVoiceRecordCancel()
            return
          }

          const voiceCtx = getSendContext()
          if (!voiceCtx) {
            voiceSending.value = false
            onVoiceRecordCancel()
            return
          }

          return dispatchSendMessage(
            localMsg.id,
            {
              sessionId: voiceCtx.sessionId,
              msgType: 'voice',
              content: voiceContent
            },
            voiceCtx.toId,
            voiceCtx.sessionId
          ).finally(() => {
            voiceSending.value = false
            onVoiceRecordCancel()
          })
        })
      })
      .catch(() => {
        voiceSending.value = false
        onVoiceRecordCancel()
        window.$message?.error(t('message.voiceRecord.uploadFailed'))
      })
  }

  const onEmojiSelect = (item: Sticker) => {
    emojiPickerVisible.value = false
    if (item.type === 'unicode') {
      if (!editorRef.value) return
      editorRef.value.insertText(item.iconValue)
      return
    }

    const stickerContent = {
      stickerId: item.id,
      stickerUrl: item.iconUrl,
      stickerName: item.name
    }
    const stickerCtx = getSendContext()
    if (!stickerCtx) return

    const localMsg = createAndStageLocalMessage('sticker', stickerContent)
    if (!localMsg) return

    void dispatchSendMessage(
      localMsg.id,
      {
        sessionId: stickerCtx.sessionId,
        msgType: 'sticker',
        content: stickerContent
      },
      stickerCtx.toId,
      stickerCtx.sessionId
    )
  }
</script>
<style scoped lang="scss">
  .chat-session {
    position: relative;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .chat-session__header {
      position: relative;
      z-index: 2;
      height: 48px;
      display: flex;
      align-items: center;
      border-bottom: 1px var(--divider-color) solid;
      padding: 0 10px;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .chat-session__header-info {
      display: flex;
      align-items: center;
      align-self: stretch;
      min-width: 0;
      flex: 1;
      user-select: none;
    }

    .chat-session__header-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .chat-session__body {
      position: relative;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .chat-session__split {
      flex: 1;
      min-height: 0;
    }

    .chat-session__content {
      position: relative;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .chat-session__new-msg {
      position: absolute;
      left: 50%;
      bottom: 12px;
      z-index: 2;
      transform: translateX(-50%);
      padding: 4px 24px;
      border: none;
      border-radius: 18px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--primary-color);
      background: color-mix(in srgb, var(--bg-primary-color) 80%, transparent);
      backdrop-filter: blur(5px);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      border: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--primary-color) 8%, var(--bg-muted-color));
      }
    }

    .chat-session__input {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 5px 15px 10px 15px;
      align-items: flex-start;
      height: 100%;
      min-height: 0;
      overflow: hidden;

      .chat-session__voice-bar {
        flex: 1;
        min-width: 0;
      }
    }
  }
</style>
