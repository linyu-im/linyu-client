<template>
  <div class="chat-session">
    <!-- 相关用户信息 -->
    <div class="chat-session__header" @click="onHeaderClick">
      <div v-if="peerInfo" class="chat-session__header-info">
        <div class="text-16px font-bold truncate">{{ peerInfo.remark || peerInfo.username }}</div>
        <div class="flex items-center justify-center text-12px text-[var(--text-muted-color)] m-l-10px">
          <img class="size-14px" :src="peerInfo.emotionUrl" alt="" />
          <div class="m-l-2px">{{ peerInfo.emotionName }}</div>
        </div>
      </div>
      <div v-else class="chat-session__header-info">
        <div class="text-16px font-bold truncate"></div>
      </div>
      <div class="chat-session__header-actions" @click.stop>
        <SvgIconButton href="#record" />
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
              :key="props.toId"
              :messages="messages"
              :loading="loading"
              :loading-more="loadingMore"
              :has-more="hasMore"
              @reach-top="onLoadMore"
              @at-bottom-change="onAtBottomChange" />
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
                <n-button size="tiny" type="primary" class="w-56px m-l-20px p-y-12px" @click="onSend()">
                  {{ t('message.editor.send') }}
                </n-button>
              </div>
            </div>
          </div>
        </template>
      </Split>
      <ChatSessionSettingsDrawer
        :show="settingsDrawerVisible"
        :peer-info="peerInfo"
        :chat-id="chatStore.selectedChatId"
        @close="settingsDrawerVisible = false" />
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { messageApi, robotApi, userApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import { useUserStore } from '@/stores/user'
  import { useChatStore } from '@/stores/chat'
  import { useMessageDbStore } from '@/stores/messageDb'
  import type { Message } from '@/types/api/message'
  import type { UserInfoResult } from '@/types/api/user'
  import { buildSendParam, buildSendUnitsFromSegments, unitNeedsMediaUpload } from '@/utils/editorMessage'
  import { createLocalMessageFromUnit, patchMessageById, resolveMessageFailReason } from '@/utils/messageSend'
  import { useMessageUploadStore } from '@/stores/messageUpload'
  import { useSendingMessagesStore } from '@/stores/sendingMessages'
  import MessageEditor, { type EditorPayload } from './Message/MessageEditor/index.vue'
  import type { MentionItem } from './Message/MessageEditor/MentionList.vue'
  import MessageList from './Message/MessageList/index.vue'
  import EmojiPicker from './Message/EmojiPicker/index.vue'
  import VoiceRecordBar from './Message/VoiceRecordBar.vue'
  import ChatSessionSettingsDrawer from './ChatSessionSettingsDrawer.vue'
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
  import { openAndFocusWindow } from '@/utils/window.ts'

  const props = defineProps<{
    toId: string
    sceneType: SceneType
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()
  const chatStore = useChatStore()
  const messageDbStore = useMessageDbStore()
  const messageUploadStore = useMessageUploadStore()
  const sendingMessagesStore = useSendingMessagesStore()

  const PAGE_SIZE = 20
  const pendingNewCount = ref(0)
  const messages = ref<Message[]>([])
  const page = ref(0)
  const totalPage = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)

  const hasMore = computed(() => page.value > 0 && page.value < totalPage.value)

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
  const peerInfo = ref<UserInfoResult | null>(null)
  const settingsDrawerVisible = ref(false)

  const onHeaderClick = () => {
    if (settingsDrawerVisible.value) {
      settingsDrawerVisible.value = false
    }
  }

  const onMoreClick = () => {
    settingsDrawerVisible.value = !settingsDrawerVisible.value
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

  const mergeMessages = (incoming: Message[], existing: Message[]) => {
    const older = toDisplayOrder(incoming)
    const map = new Map<string, Message>()
    for (const msg of [...older, ...existing]) {
      map.set(msg.id, msg)
    }
    return [...map.values()]
  }

  const isSelfMessage = (msg: Message) => {
    const uid = userStore.authInfo.userId
    return !!uid && msg.fromId === uid
  }

  const isPeerMessage = (msg: Message) => !!props.toId && msg.fromId === props.toId

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

  defineExpose({ appendMessage })

  const resetMessages = () => {
    messages.value = []
    page.value = 0
    totalPage.value = 0
    loading.value = false
    loadingMore.value = false
    pendingNewCount.value = 0
  }

  const fetchMessagePage = async (targetPage: number) => {
    const toId = props.toId
    if (!toId) return null

    // 从 chatList 中找到对应的 sessionId
    const chat = chatStore.chatList.find((item) => item.peerId === toId)
    if (!chat) return null

    const result = await messageDbStore.loadMessagesFromDb(chat.sessionId, targetPage, PAGE_SIZE)

    const records = result.records.map((item) => normalizeMessage(item as Message))
    return {
      records,
      page: result.page,
      totalPage: result.totalPage
    }
  }

  const loadInitialMessages = async () => {
    if (!props.toId) {
      resetMessages()
      return
    }

    resetMessages()
    loading.value = true

    try {
      const result = await fetchMessagePage(1)
      if (!result) return

      const serverMessages = toDisplayOrder(result.records)
      const pendingMessages = sendingMessagesStore.getMessages(props.toId)
      const serverIds = new Set(serverMessages.map((m) => m.id))
      const uniquePending = pendingMessages.filter((m) => !serverIds.has(m.id))

      messages.value = [...serverMessages, ...uniquePending]
      page.value = result.page
      totalPage.value = result.totalPage
    } finally {
      loading.value = false
      nextTick(() => messageListRef.value?.scrollToBottom())
    }
  }

  const onLoadMore = async () => {
    if (!props.toId || loading.value || loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    try {
      const result = await fetchMessagePage(page.value + 1)
      if (!result) return

      messages.value = mergeMessages(result.records, messages.value)
      page.value = result.page
      totalPage.value = result.totalPage
    } finally {
      loadingMore.value = false
    }
  }

  watch(
    () => props.toId,
    () => {
      loadInitialMessages()
    },
    { immediate: true }
  )

  watch(
    () => props.toId,
    () => {
      settingsDrawerVisible.value = false

      if (!voiceRecordingVisible.value) return
      cancelVoiceRecord()
      voiceSending.value = false
      voiceRecordingVisible.value = false
      resetVoiceRecordLimitState()
    }
  )

  const loadPeerInfo = () => {
    if (!props.toId) {
      peerInfo.value = null
      return
    }

    userApi.getUserInfo({ userId: props.toId }).then((res) => {
      if (res.code === 0 && res.data) {
        peerInfo.value = res.data
      }
    })
  }

  watch(() => props.toId, loadPeerInfo, { immediate: true })

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

  const replaceLocalMessage = (localId: string, serverMsg: Message) => {
    messageUploadStore.clearProgress(localId)
    sendingMessagesStore.removeMessage(props.toId, localId)
    messages.value = messages.value.map((item) => (item.id === localId ? normalizeMessage(serverMsg as Message) : item))
  }

  const markLocalMessageFailed = (localId: string, reason: string) => {
    messageUploadStore.clearProgress(localId)
    sendingMessagesStore.updateMessage(props.toId, localId, {
      status: 'failed',
      failReason: reason
    })
    messages.value = patchMessageById(messages.value, localId, {
      status: 'failed',
      failReason: reason
    })
  }

  const sendLocalMessage = (localId: string, unit: ReturnType<typeof buildSendUnitsFromSegments>[number]) => {
    if (unitNeedsMediaUpload(unit)) {
      messageUploadStore.setProgress(localId, 0)
    }

    const onProgress = (progress: number) => {
      messageUploadStore.setProgress(localId, progress)
    }

    return buildSendParam(unit, props.toId, { onProgress }).then((param) => {
      messageUploadStore.clearProgress(localId)
      if (!param) {
        markLocalMessageFailed(localId, t('message.sendStatus.uploadFailed'))
        return
      }

      return messageApi.sendToUser(param).then((res) => {
        if (res.code === 0 && res.data) {
          replaceLocalMessage(localId, res.data)
        } else {
          markLocalMessageFailed(localId, resolveMessageFailReason(res.code, res.msg, t))
        }
      })
    })
  }

  const sendRobotAnswers = (
    unit: Extract<ReturnType<typeof buildSendUnitsFromSegments>[number], { msgType: 'text' }>
  ) => {
    if (!props.toId) return []

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
              peerId: props.toId,
              robotId: mention.id,
              question,
              sceneType: props.sceneType
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
                    toId: props.toId,
                    msgType: 'text',
                    content: { text: accumulated },
                    fromType: 'robot',
                    isShowTime: false,
                    sceneType: props.sceneType,
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

    const fromId = userStore.authInfo.userId
    if (!fromId || !props.toId) return

    const units = buildSendUnitsFromSegments(payload.segments)
    if (!units.length) return

    const localMessages = units.map((unit) => createLocalMessageFromUnit(unit, fromId, props.toId, props.sceneType))

    for (const localMsg of localMessages) {
      appendMessage(localMsg)
      sendingMessagesStore.addMessage(props.toId, localMsg)
    }

    editorRef.value.clear({ keepBlobs: true })

    const sendTasks = units.flatMap((unit, index) => {
      const tasks: Promise<void | undefined>[] = [sendLocalMessage(localMessages[index].id, unit)]
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

          return messageApi
            .sendToUser({
              toUserId: props.toId,
              msgType: 'voice',
              content: {
                voiceUrl,
                voiceDuration: String(result.durationSec)
              }
            })
            .then((res) => {
              voiceSending.value = false
              onVoiceRecordCancel()
              if (res.code === 0 && res.data) {
                appendMessage(res.data)
              } else {
                window.$message?.error(res.msg)
              }
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
    messageApi
      .sendToUser({
        toUserId: props.toId,
        msgType: 'sticker',
        content: {
          stickerUrl: item.iconUrl,
          stickerName: item.name
        }
      })
      .then((res) => {
        if (res.code === 0 && res.data) {
          appendMessage(res.data)
        } else {
          window.$message?.error(res.msg)
        }
      })
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
