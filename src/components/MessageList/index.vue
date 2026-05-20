<template>
  <n-scrollbar ref="scrollbarRef" class="message-list" @scroll="onScroll">
    <div class="message-list__inner">
      <template v-for="message in messages" :key="message.id">
        <Time v-if="message.isShowTime" :time="message.createdAt" />
        <div class="message-list__row" :class="{ 'message-list__row--self': isSelf(message) }">
          <Avatar class="message-list__avatar" :id="message.fromId" :type="message.fromType" :size="32" />
          <div
            class="message-list__bubble"
            :class="{
              'message-list__bubble--self':
                isSelf(message) && message.msgType !== 'file' && message.msgType !== 'ecard',
              'message-list__bubble--plain': isPlainBubble(message),
              'message-list__bubble--text': message.msgType === 'text',
              'message-list__bubble--file': message.msgType === 'file',
              'message-list__bubble--ecard': message.msgType === 'ecard'
            }">
            <Item :message="message" :is-self="isSelf(message)" />
          </div>
        </div>
      </template>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
  import type { ScrollbarInst } from 'naive-ui'
  import { useUserStore } from '@/stores/user'
  import type { Message } from '@/types/api/message'

  const userStore = useUserStore()

  const props = defineProps({
    messages: {
      type: Array as PropType<Message[]>,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingMore: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits<{
    'reach-top': []
  }>()

  const scrollbarRef = ref<ScrollbarInst | null>(null)
  const reachTopLocked = ref(false)
  let savedScrollHeight = 0
  let savedScrollTop = 0

  const SCROLL_TOP_THRESHOLD = 48

  const getScrollContainer = (): HTMLElement | null => {
    const inst = scrollbarRef.value
    if (!inst) return null
    return (inst as ScrollbarInst & { containerRef?: HTMLElement | null }).containerRef ?? null
  }

  const scrollToBottom = () => {
    nextTick(() => {
      const container = getScrollContainer()
      if (container) {
        container.scrollTop = container.scrollHeight
        return
      }
      scrollbarRef.value?.scrollTo({ top: Number.MAX_SAFE_INTEGER })
    })
  }

  const onScroll = (e: Event) => {
    if (!props.hasMore || props.loadingMore || props.loading) return

    const target = e.target as HTMLElement
    if (target.scrollTop > SCROLL_TOP_THRESHOLD) {
      reachTopLocked.value = false
      return
    }
    if (reachTopLocked.value) return

    const container = getScrollContainer()
    if (container) {
      savedScrollHeight = container.scrollHeight
      savedScrollTop = container.scrollTop
    }
    reachTopLocked.value = true
    emit('reach-top')
  }

  watch(
    () => props.messages,
    (newMessages, oldMessages) => {
      const prepended =
        (oldMessages?.length ?? 0) > 0 &&
        newMessages.length > (oldMessages?.length ?? 0) &&
        newMessages[0]?.id !== oldMessages?.[0]?.id

      nextTick(() => {
        const container = getScrollContainer()
        if (!container) {
          if (!prepended) scrollToBottom()
          return
        }

        if (prepended) {
          const newHeight = container.scrollHeight
          container.scrollTop = newHeight - savedScrollHeight + savedScrollTop
          reachTopLocked.value = false
        } else {
          container.scrollTop = container.scrollHeight
        }
      })
    },
    { flush: 'post' }
  )

  watch(
    () => props.loadingMore,
    (loading) => {
      if (!loading) {
        reachTopLocked.value = false
      }
    }
  )

  defineExpose({ scrollToBottom })

  const isSelf = (message: Message) => {
    const uid = userStore.authInfo.userId
    return !!uid && message.fromId === uid
  }

  const isPlainBubble = (message: Message) => message.msgType === 'image' || message.msgType === 'video'
</script>

<style scoped lang="scss">
  .message-list {
    height: 100%;
    min-height: 0;

    :deep(.n-scrollbar-container) {
      height: 100%;
    }

    :deep(.n-scrollbar-content) {
      min-height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    &__inner {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 12px 16px 16px;
      font-size: 12px;
    }

    &__row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;

      &--self {
        flex-direction: row-reverse;
      }
    }

    &__avatar {
      flex-shrink: 0;
      border-radius: 4px;
      overflow: hidden;
    }

    &__bubble {
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 14px;
      background: var(--bg-primary-color);
      color: var(--text-primary-color);
      word-break: break-word;

      &--self {
        background: var(--primary-color);
        color: #fff;
      }

      &--text {
        box-sizing: border-box;
        max-width: 70%;
        width: fit-content;
      }

      &--file,
      &--ecard {
        padding: 0;
        background: var(--bg-primary-color);
        color: var(--text-primary-color);
      }

      &--plain {
        padding: 0;
        background: transparent;
        color: inherit;

        &.message-list__bubble--self {
          background: transparent;
          color: inherit;
        }
      }
    }
  }
</style>
