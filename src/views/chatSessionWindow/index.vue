<script setup lang="ts">
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import ChatSession from '@/components/Chat/ChatSession.vue'
  import { useChatStore } from '@/stores/chat/chat'
  import {
    closeCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'

  const { t } = useI18n()
  const route = useRoute()
  const chatStore = useChatStore()

  const isMaximized = ref(false)
  let unlistenClose: (() => void) | undefined
  let released = false

  const chatId = computed(() => {
    const raw = route.query.chatId
    return typeof raw === 'string' ? raw : ''
  })

  const chat = computed(() => chatStore.chatList.find((item) => item.id === chatId.value) ?? null)

  const releaseDetached = () => {
    if (released) return
    const id = chatId.value
    if (!id) return
    released = true
    chatStore.attachChat(id)
  }

  const onCloseWindow = () => {
    releaseDetached()
    closeCurrentWindow()
  }

  watch(
    chatId,
    (id, prevId) => {
      if (prevId) chatStore.attachChat(prevId)
      released = false
      if (id) {
        chatStore.detachChat(id)
        chatStore.markRead(id)
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    if (!chat.value && chatId.value) {
      chatStore.loadList()
    }
    ShowCurrentWindow()

    WebviewWindow.getCurrent()
      .onCloseRequested(() => {
        releaseDetached()
      })
      .then((unlisten) => {
        unlistenClose = unlisten
      })
  })

  onBeforeUnmount(() => {
    unlistenClose?.()
    releaseDetached()
  })
</script>

<template>
  <div class="chat-session-window">
    <ToolBar class="chat-session-window__toolbar" @maximized="(is) => (isMaximized = is)">
      <div class="chat-session-window__drag" data-tauri-drag-region />
      <div class="chat-session-window__actions">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="onCloseWindow" />
      </div>
    </ToolBar>

    <div class="chat-session-window__body">
      <ChatSession v-if="chat" :chat="chat" />
      <div v-else class="chat-session-window__empty">
        <LinyuEmpty />
        <span class="chat-session-window__empty-text">{{ t('message.noChat') }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .chat-session-window {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background-color: var(--bg-secondary-color);

    &__toolbar {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      height: 36px;
      padding: 0 4px 0 12px;
      box-sizing: border-box;
    }

    &__drag {
      flex: 1;
      height: 100%;
      min-width: 0;
    }

    &__actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    &__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    &__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 100%;
      color: var(--text-color);
      background-color: var(--bg-primary-color);
    }

    &__empty-text {
      font-size: 12px;
      color: var(--text-secondary-color);
    }
  }
</style>
