<template>
  <n-scrollbar ref="scrollbarRef" class="message-list" :theme-overrides="{ width: '7px' }" @scroll="onScroll">
    <div ref="innerRef" class="message-list__inner">
      <template v-for="message in displayMessages" :key="message.renderKey ?? message.id">
        <Time v-if="message.isShowTime" :time="message.createdAt" />
        <div
          v-memo="[
            message.renderKey ?? message.id,
            message.id,
            message.status,
            message.quoteMsgId,
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
                  isSelf(message) &&
                  message.msgType !== 'file' &&
                  message.msgType !== 'cloud_share' &&
                  message.msgType !== 'ecard',
                'message-list__bubble--plain': isPlainBubble(message),
                'message-list__bubble--text': message.msgType === 'text',
                'message-list__bubble--file': message.msgType === 'file',
                'message-list__bubble--cloud-share': message.msgType === 'cloud_share',
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
              v-if="message.quoteMsgId"
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
  import { SceneType } from '@/constants/common'
  import MessageQuotePreview from '@/components/Message/MessageQuotePreview.vue'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useMessageActionsStore } from '@/stores/message/messageActions'

  const { t } = useI18n()
  const userStore = useUserStore()
  const messageDbStore = useMessageDbStore()
  const messageActionsStore = useMessageActionsStore()

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
  /** 等引用预取完成后再渲染，避免引用插入后高度变化导致滚底闪烁 */
  const displayMessages = shallowRef<Message[]>([])
  /** 已拉取的引用消息缓存（含未找到的 null） */
  const quotedById = shallowRef(new Map<string, Message | null>())
  let quotedPrefetchToken = 0
  let renderToken = 0
  let savedScrollHeight = 0
  let savedScrollTop = 0
  let scrollContainerEl: HTMLElement | null = null
  let pendingScrollToBottom = false
  let resizeObserver: ResizeObserver | null = null
  /** 进行中的引用预取，scrollToBottom 需等待 */
  let pendingQuotesReady: Promise<void> = Promise.resolve()

  const SCROLL_TOP_THRESHOLD = 48
  const SCROLL_BOTTOM_THRESHOLD = 48

  const collectQuoteMsgIds = (msgs: Message[]) => [
    ...new Set(msgs.map((item) => item.quoteMsgId?.trim()).filter((id): id is string => !!id))
  ]

  /** 批量预取引用消息；仅在全部就绪后更新缓存 */
  const prefetchQuotedMessages = (msgs: Message[]) => {
    const ids = collectQuoteMsgIds(msgs)
    if (ids.length === 0) return Promise.resolve()

    const next = new Map(quotedById.value)
    const messageById = new Map(msgs.map((item) => [item.id, item]))
    const pendingIds: string[] = []
    let changed = false

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

    if (pendingIds.length === 0) {
      if (changed) quotedById.value = next
      return Promise.resolve()
    }

    const token = ++quotedPrefetchToken
    return messageDbStore.getMessagesByIds(pendingIds).then((map) => {
      if (token !== quotedPrefetchToken) return
      pendingIds.forEach((id) => {
        next.set(id, map.get(id) ?? null)
      })
      quotedById.value = next
    })
  }

  const isDisplaySynced = () => {
    const display = displayMessages.value
    const source = props.messages
    if (display.length !== source.length) return false
    if (source.length === 0) return true
    const lastDisplay = display[display.length - 1]
    const lastSource = source[source.length - 1]
    return (lastDisplay?.renderKey ?? lastDisplay?.id) === (lastSource?.renderKey ?? lastSource?.id)
  }

  const getQuotedMessage = (quoteMsgId?: string) => {
    if (!quoteMsgId) return null
    return quotedById.value.get(quoteMsgId) ?? null
  }

  /** 删除消息时同步清理引用缓存，避免仍展示已删内容 */
  const removeQuotedCache = (messageId: string) => {
    if (!messageId || !quotedById.value.has(messageId)) return
    const next = new Map(quotedById.value)
    next.set(messageId, null)
    quotedById.value = next
  }

  const onDeleteMessage = (message: Message) => {
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
      // keep-alive 隐藏时 clientHeight 为 0，此时不能当作已滚到底，否则会清掉 pending
      if (container.clientHeight <= 0) {
        return false
      }
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

  /** 等待引用预取 + displayMessages 同步后再滚底，避免半渲染状态闪烁 */
  const scrollToBottom = () => {
    pendingScrollToBottom = true

    const run = (retry = 0) => {
      pendingQuotesReady.finally(() => {
        if (!isDisplaySynced()) {
          if (retry < 30) nextTick(() => run(retry + 1))
          return
        }
        nextTick(() => {
          tryScrollToBottom()
          requestAnimationFrame(() => {
            tryScrollToBottom()
            requestAnimationFrame(() => {
              tryScrollToBottom()
              // 布局未稳定（如刚从 keep-alive 恢复）时继续重试，直到真正到底
              if (pendingScrollToBottom && retry < 30) {
                requestAnimationFrame(() => run(retry + 1))
              }
            })
          })
        })
      })
    }

    run()
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

  onActivated(() => {
    // 从其他页返回时重新尝试滚底（隐藏期间的滚底常因 clientHeight=0 失败）
    if (pendingScrollToBottom || atBottomRef.value) {
      scrollToBottom()
    }
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

  /**
   * 消息变更：先预取引用，再一次性写入 displayMessages。
   * 避免「先无引用渲染 → 引用插入撑高 → 再滚底」造成闪烁。
   */
  watch(
    () => props.messages,
    (newMessages, oldMessages) => {
      const token = ++renderToken
      const prepended =
        (oldMessages?.length ?? 0) > 0 &&
        newMessages.length > (oldMessages?.length ?? 0) &&
        newMessages[0]?.id !== oldMessages?.[0]?.id

      const isInitialFill = (oldMessages?.length ?? 0) === 0 && newMessages.length > 0
      const shouldStickBottom = isInitialFill || pendingScrollToBottom || atBottomRef.value

      if (newMessages.length === 0) {
        quotedPrefetchToken += 1
        quotedById.value = new Map()
        displayMessages.value = []
        pendingQuotesReady = Promise.resolve()
        return
      }

      if (prepended) {
        const container = getScrollContainer()
        if (container) {
          savedScrollHeight = container.scrollHeight
          savedScrollTop = container.scrollTop
        }
      }

      const quotesReady = prefetchQuotedMessages(newMessages)
      pendingQuotesReady = quotesReady

      quotesReady.then(() => {
        if (token !== renderToken) return

        displayMessages.value = newMessages

        nextTick(() => {
          if (token !== renderToken) return

          if (prepended) {
            const el = getScrollContainer()
            if (el) {
              el.scrollTop = el.scrollHeight - savedScrollHeight + savedScrollTop
              reachTopLocked.value = false
              syncAtBottom(el)
            }
            return
          }

          if (shouldStickBottom) {
            reachTopLocked.value = false
            scrollToBottom()
          }
        })
      })
    },
    { flush: 'post', immediate: true }
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
    () => messageActionsStore.deletedSeq,
    () => {
      removeQuotedCache(messageActionsStore.deletedMessageId)
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
      &--cloud-share,
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
