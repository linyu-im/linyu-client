<template>
  <div class="chat-session">
    <!-- 相关用户信息 -->
    <div class="chat-session__header">
      <div class="flex select-none">
        <div class="text-16px font-bold truncate">阿如</div>
        <div class="flex items-center justify-center text-12px text-[var(--text-muted-color)] m-l-10px">
          <img class="size-14px" src="/emotion/empty.png" alt="" />
          <div class="m-l-2px">自由万岁</div>
        </div>
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
          <MessageList :messages="demoMessages" />
        </div>
      </template>
      <template #second>
        <div class="chat-session__input">
          <div class="flex w-full items-center justify-between m-b-5px">
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
            </div>
          </div>
          <div class="flex-1 flex w-full min-h-0">
            <MessageEditor
              ref="editorRef"
              v-model="draft"
              :fetch-mentions="onFetchMentions"
              @submit="onSend"
              @file-rejected="onFileRejected" />
          </div>
          <div class="flex w-full items-center justify-end m-t-10px">
            <n-button size="tiny" type="primary" class="w-60px" @click="onSend()">
              {{ t('message.editor.send') }}
            </n-button>
          </div>
        </div>
      </template>
    </Split>
  </div>
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useUserStore } from '@/stores/user'
  import type { Message } from '@/types/api/message'

  const { t } = useI18n()
  const userStore = useUserStore()

  const DEMO_PEER_ID = 'peer-demo-aru'
  const DEMO_SELF = 'demo-self'

  const rawDemoMessages: Array<Message & { fromId: string }> = [
    {
      id: '1',
      sessionId: 'session-demo',
      fromId: DEMO_PEER_ID,
      toId: 'self',
      msgType: 'text',
      content: { text: '你好，最近在忙什么？' },
      fromType: 'user',
      isShowTime: true,
      msgScene: 'private',
      createdAt: '2026-05-19 09:12:00',
      updatedAt: '2026-05-19 09:12:00'
    },
    {
      id: '2',
      sessionId: 'session-demo',
      fromId: DEMO_SELF,
      toId: DEMO_PEER_ID,
      msgType: 'text',
      content: { text: '在写林语客户端的消息列表，刚把气泡样式搭好。' },
      fromType: 'user',
      isShowTime: false,
      msgScene: 'private',
      createdAt: '2026-05-19 09:13:20',
      updatedAt: '2026-05-19 09:13:20'
    },
    {
      id: '3',
      sessionId: 'session-demo',
      fromId: DEMO_PEER_ID,
      toId: 'self',
      msgType: 'image',
      content: {
        imgUrl: 'https://picsum.photos/seed/linyu-demo/480/320',
        imgThumbUrl: 'https://picsum.photos/seed/linyu-demo/240/160',
        imgName: 'sunset.jpg',
        imgSize: '245760'
      },
      fromType: 'user',
      isShowTime: false,
      msgScene: 'private',
      createdAt: '2026-05-19 09:14:05',
      updatedAt: '2026-05-19 09:14:05'
    },
    {
      id: '4',
      sessionId: 'session-demo',
      fromId: DEMO_SELF,
      toId: DEMO_PEER_ID,
      msgType: 'voice',
      content: { voiceUrl: '', voiceDuration: '12' },
      fromType: 'user',
      isShowTime: false,
      msgScene: 'private',
      createdAt: '2026-05-19 09:15:10',
      updatedAt: '2026-05-19 09:15:10'
    },
    {
      id: '5',
      sessionId: 'session-demo',
      fromId: DEMO_PEER_ID,
      toId: 'self',
      msgType: 'file',
      content: {
        fileUrl: '#',
        fileType: 'application/pdf',
        fileName:
          '林语产品的说明林语产品的说明林语产品的说明林语产品的说明林语产品的说明林语产品的说明林语产品的说明林语产品的说明.pdf',
        fileSize: '1048576'
      },
      fromType: 'user',
      isShowTime: true,
      msgScene: 'private',
      createdAt: '2026-05-19 10:02:00',
      updatedAt: '2026-05-19 10:02:00'
    },
    {
      id: '51',
      sessionId: 'session-demo',
      fromId: DEMO_PEER_ID,
      toId: 'self',
      msgType: 'file',
      content: {
        fileUrl: '#',
        fileType: 'application/text',
        fileName: '林语产品的333333333.mp',
        fileSize: '1048576'
      },
      fromType: 'user',
      isShowTime: true,
      msgScene: 'private',
      createdAt: '2026-05-19 10:02:00',
      updatedAt: '2026-05-19 10:02:00'
    },
    {
      id: '6',
      sessionId: 'session-demo',
      fromId: DEMO_SELF,
      toId: DEMO_PEER_ID,
      msgType: 'ecard',
      content: {
        userId: 'u-designer',
        userName: '设计师小林',
        userAvatar: '/avatar.png'
      },
      fromType: 'user',
      isShowTime: false,
      msgScene: 'private',
      createdAt: '2026-05-19 10:03:30',
      updatedAt: '2026-05-19 10:03:30'
    },
    {
      id: '7',
      sessionId: 'session-demo',
      fromId: DEMO_PEER_ID,
      toId: 'self',
      msgType: 'text',
      content: { text: '看起来不错，右键消息试试菜单 👍' },
      fromType: 'user',
      isShowTime: false,
      msgScene: 'private',
      createdAt: '2026-05-19 10:04:00',
      updatedAt: '2026-05-19 10:04:00'
    }
  ]

  const demoMessages = computed<Message[]>(() => {
    const sid = userStore.authInfo.userId || DEMO_SELF
    return rawDemoMessages.map((msg) => ({
      ...msg,
      fromId: msg.fromId === DEMO_SELF ? sid : msg.fromId
    }))
  })
  import MessageEditor, { type EditorPayload } from './MessageEditor/index.vue'
  import type { MentionItem } from './MessageEditor/MentionList.vue'

  const draft = ref('')
  const editorRef = ref<InstanceType<typeof MessageEditor> | null>(null)

  // 演示用静态成员列表，后续替换为接口数据
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

  const onSend = (payload?: EditorPayload) => {
    if (!editorRef.value) return
    if (payload) {
      console.log('[ChatSession] submit payload =', payload)
      console.log('[ChatSession] html    =', payload.html)
      console.log('[ChatSession] text    =', payload.text)
      console.log('[ChatSession] json    =', JSON.stringify(payload.json, null, 2))
      console.log('[ChatSession] segments =', payload.segments)
      console.table(payload.segments)
      window.$message?.success(t('message.editor.sendSuccess', { count: payload.segments.length }))
      editorRef.value.clear()
    } else {
      editorRef.value.submit()
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
