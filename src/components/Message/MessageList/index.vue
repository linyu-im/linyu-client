<template>
  <n-scrollbar ref="scrollbarRef" class="message-list" :theme-overrides="{ width: '7px' }" @scroll="onScroll">
    <div ref="innerRef" class="message-list__inner">
      <template v-for="message in messages" :key="message.renderKey ?? message.id">
        <Time v-if="message.isShowTime" :time="message.createdAt" />
        <div
          v-memo="[
            message.renderKey ?? message.id,
            message.id,
            message.status,
            message.quoteMsgId,
            hasQuotedLookup(message.quoteMsgId),
            getQuotedMessage(message.quoteMsgId)?.id ?? ''
          ]"
          class="message-list__row"
          :class="{ 'message-list__row--self': isSelf(message) }">
          <Avatar
            class="message-list__avatar"
            :id="message.fromId"
            :type="message.fromType"
            :size="32"
            instant
            :profile-enabled="message.fromType === 'user'" />
          <div class="message-list__main" :class="{ 'message-list__main--text': message.msgType === 'text' }">
            <Name
              v-if="message.fromType === 'robot'"
              class="message-list__name"
              :id="message.fromId"
              type="robot"
              instant
              :tag="t('message.robotTag')" />
            <Name
              v-else-if="message.sceneType === SceneType.Group"
              class="message-list__name"
              :class="{ 'message-list__name--self': isSelf(message) }"
              :id="message.fromId"
              type="user"
              instant
              :group-id="message.toId" />
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
              <Item
                :message="message"
                :is-self="isSelf(message)"
                @forward="emit('forward', $event)"
                @quote="emit('quote', $event)"
                @delete="onDeleteMessage" />
              <n-tooltip v-if="isSendFailed(message)" placement="top" :show-arrow="false">
                <template #trigger>
                  <button type="button" class="message-list__fail-btn" aria-label="send failed" @click.stop>
                    <span class="message-list__fail-icon">!</span>
                  </button>
                </template>
                {{ getFailReason(message) }}
              </n-tooltip>
            </div>
            <MessageQuotePreview
              v-if="message.quoteMsgId && hasQuotedLookup(message.quoteMsgId)"
              class="message-list__quote"
              :message="getQuotedMessage(message.quoteMsgId)"
              :missing-text="t('message.quote.notFound')" />
          </div>
        </div>
      </template>
    </div>
    <div ref="bottomAnchorRef" class="message-list__bottom-anchor" aria-hidden="true" />
  </n-scrollbar>
</template>

<script setup lang="ts">
  import type { ScrollbarInst } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import { useUserStore } from '@/stores/user/user'
  import type { Message } from '@/types/api/message'
  import { onBeforeUnmount, onMounted } from 'vue'
  import { SceneType } from '@/constants/common'
  import MessageQuotePreview from '@/components/Message/MessageQuotePreview.vue'
  import { useMessageDbStore } from '@/stores/message/messageDb'

  const { t } = useI18n()
  const userStore = useUserStore()
  const messageDbStore = useMessageDbStore()

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
    forward: [message: Message]
    quote: [message: Message]
    delete: [message: Message]
  }>()

  const scrollbarRef = ref<ScrollbarInst | null>(null)
  const innerRef = ref<HTMLElement | null>(null)
  const bottomAnchorRef = ref<HTMLElement | null>(null)
  const reachTopLocked = ref(false)
  const atBottomRef = ref(true)
  /** 已拉取的引用消息缓存（含未找到的 null） */
  const quotedById = shallowRef(new Map<string, Message | null>())
  let quotedPrefetchToken = 0
  let savedScrollHeight = 0
  let savedScrollTop = 0
  let scrollContainerEl: HTMLElement | null = null
  let pendingScrollToBottom = false
  let resizeObserver: ResizeObserver | null = null

  const SCROLL_TOP_THRESHOLD = 48
  const SCROLL_BOTTOM_THRESHOLD = 48

  const collectQuoteMsgIds = (msgs: Message[]) => [
    ...new Set(msgs.map((item) => item.quoteMsgId?.trim()).filter((id): id is string => !!id))
  ]

  const scrollToBottomAfterQuotes = () => {
    nextTick(() => {
      if (pendingScrollToBottom || atBottomRef.value) {
        applyScrollToBottom()
      }
    })
  }

  /** 批量预取引用消息，渲染前写入缓存，避免逐条异步闪烁与滚动跳动 */
  const prefetchQuotedMessages = (msgs: Message[]) => {
    const ids = collectQuoteMsgIds(msgs)
    if (ids.length === 0) return Promise.resolve()

    const next = new Map(quotedById.value)
    let changed = false
    const messageById = new Map(msgs.map((item) => [item.id, item]))
    const pendingIds: string[] = []

    ids.forEach((id) => {
      if (next.has(id)) return
      const local = messageById.get(id)
      if (local) {
        next.set(id, local)
        changed = true
        return
      }
      pendingIds.push(id)
    })

    if (changed) {
      quotedById.value = next
    }

    if (pendingIds.length === 0) return Promise.resolve()

    const token = ++quotedPrefetchToken
    return messageDbStore.getMessagesByIds(pendingIds).then((map) => {
      if (token !== quotedPrefetchToken) return
      const merged = new Map(quotedById.value)
      pendingIds.forEach((id) => {
        merged.set(id, map.get(id) ?? null)
      })
      quotedById.value = merged
    })
  }

  const getQuotedMessage = (quoteMsgId?: string) => {
    if (!quoteMsgId) return null
    return quotedById.value.get(quoteMsgId) ?? null
  }

  const hasQuotedLookup = (quoteMsgId?: string) => {
    if (!quoteMsgId) return false
    return quotedById.value.has(quoteMsgId)
  }

  /** 删除消息时同步清理引用缓存，避免仍展示已删内容 */
  const removeQuotedCache = (messageId: string) => {
    if (!messageId || !quotedById.value.has(messageId)) return
    const next = new Map(quotedById.value)
    next.set(messageId, null)
    quotedById.value = next
  }

  const onDeleteMessage = (message: Message) => {
    removeQuotedCache(message.id)
    emit('delete', message)
  }

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

  const handleContentResize = () => {
    if (pendingScrollToBottom) {
      tryScrollToBottom()
      return
    }
    if (atBottomRef.value) {
      applyScrollToBottom()
    }
  }

  onMounted(() => {
    resizeObserver = new ResizeObserver(() => {
      handleContentResize()
    })
    nextTick(() => {
      if (innerRef.value) {
        resizeObserver?.observe(innerRef.value)
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

      if (newMessages.length === 0) {
        quotedPrefetchToken += 1
        quotedById.value = new Map()
      }

      const quotesReady = prefetchQuotedMessages(newMessages)

      nextTick(() => {
        const container = getScrollContainer()

        if (prepended && container) {
          quotesReady.then(() => {
            nextTick(() => {
              const el = getScrollContainer()
              if (!el) return
              const newHeight = el.scrollHeight
              el.scrollTop = newHeight - savedScrollHeight + savedScrollTop
              reachTopLocked.value = false
              syncAtBottom(el)
            })
          })
          return
        }

        if (isInitialFill) {
          reachTopLocked.value = false
          quotesReady.finally(() => {
            nextTick(() => {
              scrollToBottom()
            })
          })
          return
        }

        quotesReady.then(() => {
          nextTick(() => {
            scrollToBottomAfterQuotes()
          })
        })
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

  const isSendFailed = (message: Message) => isSelf(message) && message.status === 'failed'

  const getFailReason = (message: Message) => message.failReason?.trim() || t('message.sendStatus.unknown')
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
      padding: 12px 16px;
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

        .message-list__main {
          align-items: flex-end;
        }
      }
    }

    &__avatar {
      flex-shrink: 0;
      border-radius: 4px;
      overflow: hidden;
    }

    &__main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      width: fit-content;
      max-width: 100%;

      &--text {
        max-width: 70%;
      }
    }

    &__name {
      display: inline-flex;
      align-items: center;
      height: 20px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary-color);
      line-height: 1.2;

      &--self {
        align-self: flex-end;
        justify-content: flex-end;
        text-align: right;
      }
    }

    &__quote {
      max-width: 100%;
    }

    &__fail-btn {
      position: absolute;
      left: -22px;
      bottom: 2px;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
    }

    &__fail-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--red);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      box-shadow: 0 1px 4px color-mix(in srgb, var(--red) 35%, transparent);
    }

    &__bubble {
      position: relative;
      padding: 0;
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
        width: fit-content;
      }

      &--file,
      &--ecard {
        background: var(--bg-primary-color);
        color: var(--text-primary-color);
      }

      &--plain {
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
