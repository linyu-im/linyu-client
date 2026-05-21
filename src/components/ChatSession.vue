<template>
  <div class="chat-session">
    <!-- 相关用户信息 -->
    <div class="chat-session__header">
      <div v-if="peerInfo" class="flex select-none">
        <div class="text-16px font-bold truncate">{{ peerInfo.remark || peerInfo.username }}</div>
        <div class="flex items-center justify-center text-12px text-[var(--text-muted-color)] m-l-10px">
          <img class="size-14px" :src="peerInfo.emotionUrl" alt="" />
          <div class="m-l-2px">{{ peerInfo.emotionName }}</div>
        </div>
      </div>
      <div v-else class="flex select-none">
        <div class="text-16px font-bold truncate"></div>
      </div>
      <div class="flex items-center">
        <SvgIconButton href="#record" />
        <SvgIconButton href="#more" />
      </div>
    </div>
    <Split
      class="chat-session__split"
      direction="vertical"
      fixed="second"
      :min-size="180"
      :max-size="440"
      :default-size="260">
      <template #first>
        <div class="chat-session__content">
          <MessageList
            :key="props.toId"
            :messages="messages"
            :loading="loading"
            :loading-more="loadingMore"
            :has-more="hasMore"
            @reach-top="onLoadMore" />
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
          <div class="flex w-full items-center justify-between m-t-10px">
            <div class="flex items-center gap-5px">
              <SvgIconButton href="#emotion" />
              <SvgIconButton href="#scissor" />
              <SvgIconButton href="#folder" />
              <SvgIconButton href="#image" />
              <SvgIconButton href="#microphone" />
            </div>
            <div class="flex items-center gap-5px">
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
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { messageApi, userApi } from '@/api'
  import type { Message } from '@/types/api/message'
  import type { UserInfoResult } from '@/types/api/user'
  import { buildSendParamsFromSegments, buildSendUnitsFromSegments } from '@/utils/editorMessage'
  import MessageEditor, { type EditorPayload } from './MessageEditor/index.vue'
  import type { MentionItem } from './MessageEditor/MentionList.vue'

  interface Props {
    toId?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    toId: ''
  })

  const { t } = useI18n()

  const PAGE_SIZE = 20
  const messages = ref<Message[]>([])
  const page = ref(0)
  const totalPage = ref(0)
  const loading = ref(false)
  const loadingMore = ref(false)

  const hasMore = computed(() => page.value > 0 && page.value < totalPage.value)

  const draft = ref('')
  const editorRef = ref<InstanceType<typeof MessageEditor> | null>(null)
  const peerInfo = ref<UserInfoResult | null>(null)

  type ApiMessage = Message & { MsgScene?: string }

  const normalizeMessage = (raw: ApiMessage): Message => {
    const { MsgScene, ...rest } = raw
    return {
      ...rest,
      msgScene: rest.msgScene ?? MsgScene ?? '',
      fromType: rest.fromType || 'user'
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

  const resetMessages = () => {
    messages.value = []
    page.value = 0
    totalPage.value = 0
    loading.value = false
    loadingMore.value = false
  }

  const fetchMessagePage = async (targetPage: number) => {
    const toId = props.toId
    if (!toId) return null

    const res = await messageApi.page({
      toId,
      page: targetPage,
      pageSize: PAGE_SIZE
    })

    if (res.code !== 0 || !res.data) {
      window.$message?.error(res.msg || t('message.editor.sendFailed'))
      return null
    }

    const records = res.data.records.map((item) => normalizeMessage(item as ApiMessage))
    return {
      records,
      page: res.data.page,
      totalPage: res.data.totalPage
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

      messages.value = toDisplayOrder(result.records)
      page.value = result.page
      totalPage.value = result.totalPage
    } finally {
      loading.value = false
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

  const mentionableMembers: MentionItem[] = [
    { id: '1', label: '阿如', desc: '在线' },
    { id: '2', label: '小明', desc: '在线' },
    { id: '3', label: '小红', desc: '离线' },
    { id: '4', label: '产品经理', desc: '在线' },
    { id: '5', label: '设计师', desc: '勿扰' },
    { id: '6', label: '前端开发', desc: '在线' },
    { id: '7', label: '后端开发', desc: '离线' }
  ]

  const onFetchMentions = (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return mentionableMembers
    return mentionableMembers.filter((m) => m.label.toLowerCase().includes(q))
  }

  const resolveToUserId = () => props.toId

  const onSend = async (payload?: EditorPayload) => {
    if (!editorRef.value) return
    if (!payload) {
      editorRef.value.submit()
      return
    }

    if (payload.isEmpty) return

    const toUserId = resolveToUserId()
    if (!toUserId) {
      window.$message?.warning(t('message.editor.noChatTarget'))
      return
    }

    const units = buildSendUnitsFromSegments(payload.segments)
    if (!units.length) return

    const params = await buildSendParamsFromSegments(payload.segments, toUserId)
    const skippedMedia = units.length - params.length

    if (!params.length) {
      if (skippedMedia > 0) {
        window.$message?.warning(t('message.editor.mediaUploadPending'))
      }
      return
    }

    let sent = 0
    let lastError = ''

    for (const param of params) {
      console.log(param)
      const res = await messageApi.sendToUser(param)
      if (res.code === 0) {
        sent += 1
      } else {
        lastError = res.msg
        window.$message?.error(res.msg)
      }
    }

    if (sent > 0) {
      editorRef.value.clear()
      if (skippedMedia > 0) {
        window.$message?.warning(t('message.editor.sendPartial', { sent, total: units.length }))
      } else {
        window.$message?.success(t('message.editor.sendSuccess', { count: sent }))
      }
    } else if (lastError) {
      window.$message?.error(lastError || t('message.editor.sendFailed'))
    }
  }

  const onFileRejected = ({ file, reason }: { file: File; reason: string }) => {
    const tip = reason === 'image-too-large' ? t('message.editor.imageTooLarge') : t('message.editor.fileTooLarge')
    window.$message?.warning(`${tip}：${file.name}`)
  }
</script>
<style scoped lang="scss">
  .chat-session {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;

    .chat-session__header {
      height: 48px;
      display: flex;
      align-items: center;
      border-bottom: 1px var(--divider-color) solid;
      padding: 0 10px;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .chat-session__split {
      flex: 1;
      min-height: 0;
    }

    .chat-session__content {
      height: 100%;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
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
    }
  }
</style>
