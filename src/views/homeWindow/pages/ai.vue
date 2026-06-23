<template>
  <div class="ai-chat">
    <Split :min-size="200" :max-size="320" :default-size="260">
      <template #first>
        <aside class="ai-chat__sider">
          <n-input
            v-model:value="searchKeyword"
            size="small"
            class="ai-chat__search"
            :placeholder="t('ai.searchPlaceholder')"
            clearable>
            <template #prefix>
              <svg class="size-16px text-[var(--text-secondary-color)]">
                <use href="#search"></use>
              </svg>
            </template>
          </n-input>

          <div class="ai-chat__sider-top">
            <nav class="ai-chat__nav">
              <button
                type="button"
                class="ai-chat__nav-item"
                :class="{ active: activeMenu === 'newChat' && !activeChatId }"
                @click="onSelectMenu('newChat')">
                <svg class="size-18px shrink-0" aria-hidden="true">
                  <use href="#message-plus"></use>
                </svg>
                <span>{{ t('ai.menu.newChat') }}</span>
              </button>
              <button
                type="button"
                class="ai-chat__nav-item"
                :class="{ active: activeMenu === 'tasks' && !activeChatId }"
                @click="onSelectMenu('tasks')">
                <svg class="size-18px shrink-0" aria-hidden="true">
                  <use href="#alarm"></use>
                </svg>
                <span>{{ t('ai.menu.tasks') }}</span>
              </button>
              <button
                type="button"
                class="ai-chat__nav-item"
                :class="{ active: activeMenu === 'skills' && !activeChatId }"
                @click="onSelectMenu('skills')">
                <svg class="size-18px shrink-0" aria-hidden="true">
                  <use href="#star"></use>
                </svg>
                <span>{{ t('ai.menu.skills') }}</span>
              </button>
            </nav>
          </div>

          <div class="ai-chat__sider-chats">
            <div class="ai-chat__chats-head">{{ t('ai.history.title') }}</div>
            <n-scrollbar class="ai-chat__chats-scroll">
              <div v-if="filteredChatList.length > 0" class="ai-chat__chat-list">
                <div
                  v-for="chat in filteredChatList"
                  :key="chat.id"
                  class="ai-chat__chat-item"
                  :class="{ active: activeChatId === chat.id }"
                  role="button"
                  tabindex="0"
                  @click="onSelectChat(chat, $event)"
                  @mouseleave="onChatItemMouseLeave"
                  @keydown.enter="onSelectChat(chat, $event)">
                  <span class="ai-chat__chat-item-title" :title="chat.title">{{ chat.title }}</span>
                  <button
                    type="button"
                    tabindex="-1"
                    class="ai-chat__chat-more"
                    :aria-label="t('ai.history.more')"
                    @mousedown.prevent
                    @click.stop="onChatMore(chat)">
                    <svg class="size-16px">
                      <use href="#more"></use>
                    </svg>
                  </button>
                </div>
              </div>
              <div v-else class="ai-chat__chat-empty">{{ t('ai.history.empty') }}</div>
            </n-scrollbar>
          </div>
        </aside>
      </template>

      <template #second>
        <main class="ai-chat__main">
          <div class="ai-chat__body">
            <section v-if="!hasMessages" class="ai-chat__welcome">
              <h1 class="ai-chat__welcome-title">{{ t('ai.welcome.title') }}</h1>
              <p class="ai-chat__welcome-subtitle">{{ t('ai.welcome.subtitle') }}</p>
            </section>

            <n-scrollbar v-else class="ai-chat__messages-scroll">
              <div class="ai-chat__messages">
                <AiMessageBubble
                  v-for="msg in messages"
                  :key="msg.id"
                  :role="msg.role"
                  :content="msg.content"
                  :streaming="msg.streaming"
                  :rich="msg.role === 'assistant'"
                  @regenerate="onRegenerate(msg.id)" />
              </div>
            </n-scrollbar>
          </div>

          <div class="ai-chat__composer-wrap">
            <div class="ai-chat__composer">
              <textarea
                ref="inputRef"
                v-model="inputText"
                class="ai-chat__textarea"
                :placeholder="t('ai.input.placeholder')"
                rows="4"
                @keydown="onInputKeydown"></textarea>
              <div class="ai-chat__composer-toolbar">
                <div class="ai-chat__composer-tools">
                  <button type="button" class="ai-chat__tool-btn" @click="onToolAction('attach')">
                    <svg class="size-16px">
                      <use href="#paperclip"></use>
                    </svg>
                    <span>{{ t('ai.input.attach') }}</span>
                  </button>
                  <button
                    type="button"
                    class="ai-chat__tool-btn"
                    :class="{ 'ai-chat__tool-btn--active': deepSearchEnabled }"
                    @click="deepSearchEnabled = !deepSearchEnabled">
                    <svg class="size-16px">
                      <use href="#world "></use>
                    </svg>
                    <span>{{ t('ai.input.deepSearch') }}</span>
                  </button>
                  <button
                    type="button"
                    class="ai-chat__tool-btn"
                    :class="{ 'ai-chat__tool-btn--active': codeModeEnabled }"
                    @click="codeModeEnabled = !codeModeEnabled">
                    <svg class="size-16px">
                      <use href="#code"></use>
                    </svg>
                    <span>{{ t('ai.input.codeMode') }}</span>
                  </button>
                </div>
                <div class="ai-chat__composer-actions">
                  <span class="ai-chat__composer-hint">{{ t('ai.input.hint') }}</span>
                  <button
                    type="button"
                    class="ai-chat__send-btn"
                    :disabled="!canSend"
                    :title="t('message.editor.send')"
                    @click="onSend">
                    <svg class="size-16px" aria-hidden="true">
                      <use href="#arrow-up"></use>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </template>
    </Split>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ai' })
  import AiMessageBubble from '@/components/AI/MessageBubble/index.vue'
  import type { AiMessageRole } from '@/components/AI/MessageBubble/index.vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  type MenuKey = 'newChat' | 'tasks' | 'skills'

  interface ChatMessage {
    id: string
    role: AiMessageRole
    content: string
    streaming?: boolean
  }

  const DEMO_ASSISTANT_MARKDOWN = `## 回复示例

支持 **Markdown**、列表与链接 [Linyu](https://linyu.app)。

\`\`\`typescript  
function greet(name: string) {
  return \`Hello, \${name}\`
}
\`\`\`

行内公式 $E=mc^2$，块级公式：

$$\\int_0^1 x^2 \\, dx = \\frac{1}{3}$$

![示例图片](https://picsum.photos/seed/linyu-ai/480/240)
`

  interface AiConversation {
    id: string
    title: string
    preview: string
    messages: ChatMessage[]
  }

  // TODO: 对接接口后替换为接口数据
  const chatList = ref<AiConversation[]>([
    {
      id: 'chat-1',
      title: '开发环境优化',
      preview: '请根据本周会议记录生成周报要点',
      messages: [
        { id: 'm1', role: 'user', content: '请根据本周会议记录生成周报要点' },
        {
          id: 'm2',
          role: 'assistant',
          content: `## 周报要点

1. **目标完成度**：本周核心需求已交付
2. **风险**：接口联调时间偏紧

行内公式 $E=mc^2$，代码示例：

\`\`\`bash
crontab -l
\`\`\``
        }
      ]
    },
    {
      id: 'chat-2',
      title: 'Linux查看定时任务方法',
      preview: 'crontab 与 systemd timer 区别',
      messages: [{ id: 'm3', role: 'user', content: 'Linux 如何查看定时任务' }]
    },
    {
      id: 'chat-3',
      title: '表操作SQL整理',
      preview: '对比竞品登录流程，列出可优化点',
      messages: []
    },
    {
      id: 'chat-4',
      title: '移动端登录流程体验评审',
      preview: 'review 登录页交互与异常提示',
      messages: []
    },
    {
      id: 'chat-5',
      title: '接口文档润色与示例补充',
      preview: 'REST API 说明改得更清晰',
      messages: []
    }
  ])

  const searchKeyword = ref('')
  const activeMenu = ref<MenuKey>('newChat')
  const activeChatId = ref<string | null>(null)
  const inputText = ref('')
  const inputRef = ref<HTMLTextAreaElement | null>(null)
  const deepSearchEnabled = ref(false)
  const codeModeEnabled = ref(false)
  const messages = ref<ChatMessage[]>([])

  const filteredChatList = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return chatList.value
    return chatList.value.filter(
      (chat) => chat.title.toLowerCase().includes(keyword) || chat.preview.toLowerCase().includes(keyword)
    )
  })

  const hasMessages = computed(() => messages.value.length > 0)
  const canSend = computed(() => inputText.value.trim().length > 0)

  const resetChat = () => {
    activeChatId.value = null
    messages.value = []
    inputText.value = ''
    nextTick(() => inputRef.value?.focus())
  }

  const onSelectMenu = (key: MenuKey) => {
    activeMenu.value = key
    if (key === 'newChat') {
      resetChat()
      return
    }
    activeChatId.value = null
    messages.value = []
    inputText.value = ''
    window.$message?.info(t('ai.todo'))
  }

  const blurChatItem = (target: EventTarget | null) => {
    if (target instanceof HTMLElement) target.blur()
  }

  const onChatItemMouseLeave = (e: MouseEvent) => {
    blurChatItem(e.currentTarget)
  }

  const onSelectChat = (chat: AiConversation, e?: Event) => {
    activeChatId.value = chat.id
    activeMenu.value = 'newChat'
    messages.value = [...chat.messages]
    inputText.value = ''
    if (e) blurChatItem(e.currentTarget)
  }

  const onChatMore = (_chat: AiConversation) => {
    window.$message?.info(t('ai.todo'))
  }

  const onRegenerate = (_messageId: string) => {
    window.$message?.info(t('ai.todo'))
  }

  const onToolAction = (action: 'attach') => {
    if (action === 'attach') {
      window.$message?.info(t('ai.todo'))
    }
  }

  let streamTimer: ReturnType<typeof setTimeout> | null = null

  const simulateStreamReply = () => {
    const msgId = `assistant-${Date.now()}`
    const item: ChatMessage = { id: msgId, role: 'assistant', content: '', streaming: true }
    messages.value.push(item)

    let index = 0
    const step = () => {
      const target = messages.value.find((m) => m.id === msgId)
      if (!target) return

      index = Math.min(index + 4, DEMO_ASSISTANT_MARKDOWN.length)
      target.content = DEMO_ASSISTANT_MARKDOWN.slice(0, index)

      if (index < DEMO_ASSISTANT_MARKDOWN.length) {
        streamTimer = setTimeout(step, 28)
        return
      }

      target.streaming = false
      streamTimer = null
    }

    step()
  }

  const onSend = () => {
    const text = inputText.value.trim()
    if (!text) return

    if (streamTimer) {
      clearTimeout(streamTimer)
      streamTimer = null
    }

    messages.value.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    })
    inputText.value = ''

    simulateStreamReply()
  }

  const onInputKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.isComposing) return
    if (e.shiftKey) return
    e.preventDefault()
    onSend()
  }

  onBeforeUnmount(() => {
    if (streamTimer) clearTimeout(streamTimer)
  })
</script>

<style scoped lang="scss">
  .ai-chat {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background-color: var(--bg-secondary-color);

    :deep(.split) {
      flex: 1;
      min-height: 0;
    }

    &__sider {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      padding: 14px 12px 12px;
      background-color: var(--bg-secondary-color);
      border-right: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      box-sizing: border-box;
    }

    &__search {
      flex-shrink: 0;
      margin-bottom: 12px;
      width: 100%;
      height: 36px;

      :deep(.n-input-wrapper) {
        height: 36px;
        min-height: 36px;
        padding-top: 0;
        padding-bottom: 0;
        border-radius: 8px;
        box-sizing: border-box;
      }

      :deep(.n-input__input-el) {
        height: 100%;
        line-height: 34px;
      }

      :deep(.n-input__prefix) {
        align-items: center;
      }
    }

    &__sider-top {
      flex-shrink: 0;
      padding-bottom: 4px;
    }

    &__sider-chats {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      margin-top: 8px;
      padding-top: 4px;
      box-sizing: border-box;
    }

    &__chats-head {
      flex-shrink: 0;
      margin: 4px 10px 8px;
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__chats-scroll {
      flex: 1;
      min-height: 0;
      width: 100%;
    }

    &__chat-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 4px 4px;
    }

    &__chat-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 36px;
      padding: 6px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease;

      &:hover,
      &:focus-within {
        background-color: color-mix(in srgb, var(--card-bg-color) 65%, transparent);
      }

      &:hover .ai-chat__chat-more {
        opacity: 1;
        pointer-events: auto;
      }

      &.active {
        background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);

        .ai-chat__chat-item-title {
          color: var(--text-color);
          font-weight: 500;
        }
      }
    }

    &__chat-item-title {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.35;
      color: var(--text-muted-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__chat-more {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 0.15s ease,
        background-color 0.15s ease;

      &:hover {
        background-color: var(--icon-hover-color);
        color: var(--text-color);
      }
    }

    &__chat-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 72px;
      padding: 12px 10px;
      font-size: 12px;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 2px;
    }

    &__nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted-color);
      font-size: 14px;
      cursor: pointer;
      text-align: left;
      user-select: none;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background-color: color-mix(in srgb, var(--bg-muted-color) 80%, var(--bg-secondary-color));
        color: var(--text-color);
      }

      &.active {
        background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--primary-color) 60%, transparent);
        color: var(--primary-color);
      }
    }

    &__main {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      min-width: 0;
      min-height: 0;
      background-color: var(--bg-secondary-color);
      overflow: hidden;
    }

    &__body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    &__welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
      padding: 24px 32px 12px;
      text-align: center;
      user-select: none;
    }

    &__welcome-title {
      margin: 0 0 12px;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.25;
      color: var(--text-color);
    }

    &__welcome-subtitle {
      margin: 0;
      max-width: 520px;
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-secondary-color);
    }

    &__messages-scroll {
      flex: 1;
      min-height: 0;
    }

    &__messages {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
      min-height: 100%;
      padding: 8px 0;
      box-sizing: border-box;
    }

    &__composer-wrap {
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      padding: 12px 24px 24px;
      box-sizing: border-box;
    }

    &__composer {
      width: 100%;
      max-width: 800px;
      padding: 14px 16px 12px;
      border-radius: 14px;
      background-color: var(--input-soft-bg);
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      box-sizing: border-box;
    }

    &__textarea {
      display: block;
      width: 100%;
      min-height: 88px;
      max-height: 200px;
      padding: 0;
      margin: 0 0 12px;
      border: none;
      outline: none;
      resize: none;
      background: transparent;
      color: var(--text-color);
      font-size: 14px;
      line-height: 1.6;
      font-family: inherit;

      &::placeholder {
        color: var(--text-secondary-color);
      }
    }

    &__composer-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    &__composer-tools {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }

    &__tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      border-radius: 999px;
      background-color: color-mix(in srgb, var(--button-soft-bg) 70%, var(--bg-muted-color));
      color: var(--text-secondary-color);
      font-size: 12px;
      cursor: pointer;
      user-select: none;
      transition:
        background-color 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        color: var(--text-color);
        background-color: var(--button-soft-bg);
      }

      &--active {
        color: var(--primary-color);
        border-color: color-mix(in srgb, var(--primary-color) 50%, var(--border-color));
        background-color: color-mix(in srgb, var(--primary-color) 8%, var(--bg-muted-color));
      }
    }

    &__composer-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-left: auto;
    }

    &__composer-hint {
      font-size: 11px;
      color: var(--text-secondary-color);
      white-space: nowrap;
      user-select: none;
    }

    &__send-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: 8px;
      background-color: var(--primary-color);
      color: #fff;
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background-color 0.15s ease,
        opacity 0.15s ease;

      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, var(--primary-color) 88%, #000);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }
  }
</style>
