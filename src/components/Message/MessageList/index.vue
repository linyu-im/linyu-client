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
      <div ref="bottomAnchorRef" class="message-list__bottom-anchor" aria-hidden="true" />
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
  import type { ScrollbarInst } from 'naive-ui'
  import { useUserStore } from '@/stores/user'
  import type { Message } from '@/types/api/message'
  import { onBeforeUnmount, onMounted } from 'vue'

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
    'at-bottom-change': [atBottom: boolean]
  }>()

  const scrollbarRef = ref<ScrollbarInst | null>(null)
  const bottomAnchorRef = ref<HTMLElement | null>(null)
  const reachTopLocked = ref(false)
  const atBottomRef = ref(true)
  let savedScrollHeight = 0
  let savedScrollTop = 0
  let scrollContainerEl: HTMLElement | null = null
  let pendingScrollToBottom = false
  let resizeObserver: ResizeObserver | null = null

  const SCROLL_TOP_THRESHOLD = 48
  const SCROLL_BOTTOM_THRESHOLD = 48

  const computeAtBottom = (container: HTMLElement): boolean => {
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    return distance <= SCROLL_BOTTOM_THRESHOLD
  }

  const getScrollContainer = (): HTMLElement | null => {
    if (scrollContainerEl) return scrollContainerEl

    const inst = scrollbarRef.value as {
      $el?: unknown
      containerRef?: { value?: unknown } | unknown
    } | null

    const rootEl = inst?.$el instanceof HTMLElement ? inst.$el : null
    const fromRoot = rootEl?.querySelector<HTMLElement>('.n-scrollbar-container') ?? null
    if (fromRoot) return fromRoot

    const containerRef = inst?.containerRef as { value?: unknown } | undefined
    const containerEl = containerRef?.value
    if (containerEl instanceof HTMLElement) return containerEl

    return null
  }

  const syncAtBottom = (container: HTMLElement) => {
    scrollContainerEl = container
    const atBottom = computeAtBottom(container)
    atBottomRef.value = atBottom
    emit('at-bottom-change', atBottom)
    return atBottom
  }

  const isAtBottom = (): boolean => {
    const container = getScrollContainer()
    if (!container) return atBottomRef.value
    return computeAtBottom(container)
  }

  const applyScrollToBottom = (): boolean => {
    scrollbarRef.value?.scrollTo({ top: Number.MAX_SAFE_INTEGER, behavior: 'auto' })

    const container = getScrollContainer()
    if (container) {
      container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
      syncAtBottom(container)
      return computeAtBottom(container)
    }

    bottomAnchorRef.value?.scrollIntoView({ block: 'end' })
    return false
  }

  const tryScrollToBottom = () => {
    if (!pendingScrollToBottom) return
    if (applyScrollToBottom()) {
      pendingScrollToBottom = false
    }
  }

  /** 等待布局完成后再滚到底部（首屏加载、切换会话） */
  const scrollToBottom = () => {
    pendingScrollToBottom = true
    nextTick(() => {
      tryScrollToBottom()
      requestAnimationFrame(() => {
        tryScrollToBottom()
        requestAnimationFrame(tryScrollToBottom)
      })
    })
  }

  onMounted(() => {
    resizeObserver = new ResizeObserver(() => {
      tryScrollToBottom()
    })
    nextTick(() => {
      if (bottomAnchorRef.value) {
        resizeObserver?.observe(bottomAnchorRef.value)
      }
    })
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
    scrollContainerEl = null
    pendingScrollToBottom = false
  })

  const onScroll = (e: Event) => {
    const target = e.target
    if (target instanceof HTMLElement) {
      syncAtBottom(target)
    }

    if (!props.hasMore || props.loadingMore || props.loading) return
    if (!(target instanceof HTMLElement)) return
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

      const isInitialFill = (oldMessages?.length ?? 0) === 0 && newMessages.length > 0

      nextTick(() => {
        const container = getScrollContainer()

        if (prepended && container) {
          const newHeight = container.scrollHeight
          container.scrollTop = newHeight - savedScrollHeight + savedScrollTop
          reachTopLocked.value = false
          syncAtBottom(container)
          return
        }

        if (isInitialFill) {
          scrollToBottom()
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

  watch(
    () => props.loading,
    (loading, wasLoading) => {
      if (wasLoading && !loading && props.messages.length > 0) {
        scrollToBottom()
      }
    }
  )

  defineExpose({ scrollToBottom, isAtBottom })

  const isSelf = (message: Message) => {
    const uid = userStore.authInfo.userId
    return !!uid && message.fromId === uid
  }

  const isPlainBubble = (message: Message) =>
    message.msgType === 'image' || message.msgType === 'video' || message.msgType === 'sticker'
</script>

<style scoped lang="scss">
  .message-list {
    height: 100%;
    min-height: 0;

    :deep(.n-scrollbar-container) {
      height: 100%;
    }

    :deep(.n-scrollbar-content) {
      box-sizing: border-box;
    }

    &__inner {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 12px 16px 16px;
      font-size: 12px;
    }

    &__bottom-anchor {
      height: 1px;
      flex-shrink: 0;
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
