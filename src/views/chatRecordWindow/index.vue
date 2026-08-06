<template>
  <div class="chat-record">
    <ToolBar class="chat-record__toolbar">
      <div class="chat-record__toolbar-side" data-tauri-drag-region />
      <h1 class="chat-record__title" data-tauri-drag-region>{{ pageTitle }}</h1>
      <div class="chat-record__toolbar-side chat-record__toolbar-side--actions" data-tauri-drag-region>
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <div class="chat-record__body">
      <div class="chat-record__search">
        <n-input
          v-model:value="keyword"
          class="chat-record__search-input"
          :placeholder="t('chatRecord.searchPlaceholder')"
          clearable>
          <template #prefix>
            <svg class="size-16px text-[var(--text-secondary-color)]">
              <use href="#search" />
            </svg>
          </template>
        </n-input>
      </div>

      <div class="chat-record__filters">
        <button
          v-for="filter in typeFilters"
          :key="filter.key"
          type="button"
          class="chat-record__filter"
          :class="{ 'chat-record__filter--active': activeFilter === filter.key }"
          @click="activeFilter = filter.key">
          {{ t(filter.labelKey) }}
        </button>
        <button
          type="button"
          class="chat-record__filter"
          :class="{ 'chat-record__filter--active': activeFilter === 'date' && selectedDateRange }"
          @click="openDatePicker">
          {{ t('chatRecord.filters.date') }}
          <span v-if="dateRangeText" class="chat-record__filter-date-range">{{ dateRangeText }}</span>
        </button>
      </div>

      <n-modal v-model:show="datePickerVisible" :mask-closable="true" transform-origin="center">
        <div class="chat-record__date-modal">
          <div class="chat-record__date-modal-header">
            <span class="chat-record__date-modal-title">{{ t('chatRecord.dateModalTitle') }}</span>
            <button
              type="button"
              class="chat-record__date-modal-close"
              :aria-label="t('message.file.close')"
              @click="closeDatePicker">
              <svg class="size-14px" aria-hidden="true">
                <use href="#close" />
              </svg>
            </button>
          </div>
          <n-date-picker
            v-model:value="draftDateRange"
            class="chat-record__date-picker"
            type="daterange"
            panel
            :actions="['confirm', 'clear']"
            @confirm="onDateConfirm"
            @clear="onDateClear" />
        </div>
      </n-modal>

      <n-scrollbar ref="listScrollRef" class="chat-record__list" @scroll="onScroll">
        <template v-if="messages.length > 0">
          <article v-for="message in messages" :key="message.id" v-memo="[message.id]" class="chat-record__item">
            <Avatar
              class="chat-record__item-avatar"
              :id="message.fromId"
              :type="message.fromType"
              :size="36"
              :round="false"
              instant
              :profile-enabled="message.fromType === 'user'" />
            <div class="chat-record__item-body">
              <div class="chat-record__item-meta">
                <Name class="chat-record__item-name" :id="message.fromId" :type="message.fromType ?? 'user'" instant />
                <time class="chat-record__item-time">
                  {{ formatChatRecordDateTime(message.createdAt, locale) }}
                </time>
              </div>
              <div
                class="chat-record__item-content"
                :class="{
                  'chat-record__item-content--plain': isPlainContent(message),
                  'chat-record__item-content--text': message.msgType === 'text',
                  'chat-record__item-content--file': message.msgType === 'file',
                  'chat-record__item-content--cloud-share': message.msgType === 'cloud_share',
                  'chat-record__item-content--ecard': message.msgType === 'ecard'
                }">
                <Item
                  :message="message"
                  :is-self="isSelf(message)"
                  menu-preset="record"
                  @forward="onForwardMessage"
                  @delete="onDeleteMessage" />
              </div>
            </div>
          </article>
        </template>
        <div v-else class="chat-record__empty">{{ t('chatRecord.empty') }}</div>
      </n-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useDebounceFn } from '@vueuse/core'
  import Item from '@/components/Message/MessageList/Item/index.vue'
  import { useChatRecordStore } from '@/stores/chat/chatRecord'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useUserStore } from '@/stores/user/user'
  import type { Message } from '@/types/api/message'
  import { closeCurrentWindow, minimizeCurrentWindow, ShowCurrentWindow } from '@/utils/desktop/window'
  import { formatChatRecordDateTime, formatDateRangeLabel, toBackendDateRange } from '@/utils/common/time'
  import { useMessageBubbleActions } from '@/composables/useMessageBubbleActions'

  const { t, locale } = useI18n()
  const chatRecordStore = useChatRecordStore()
  const messageDbStore = useMessageDbStore()
  const userStore = useUserStore()
  const messageBubbleActions = useMessageBubbleActions()

  type ChatRecordFilter = 'all' | 'file' | 'image' | 'video' | 'date'
  type ChatRecordMsgType = 'file' | 'image' | 'video'

  const PAGE_SIZE = 20
  const SCROLL_BOTTOM_THRESHOLD = 48

  const keyword = ref('')
  const activeFilter = ref<ChatRecordFilter>('all')
  const messages = ref<Message[]>([])
  const page = ref(0)
  const hasMore = ref(false)
  const loading = ref(false)
  const loadingMore = ref(false)
  const listScrollRef = ref<{ scrollTo: (options: { top: number }) => void } | null>(null)

  let loadSeq = 0

  const resetListScroll = () => {
    nextTick(() => {
      listScrollRef.value?.scrollTo({ top: 0 })
    })
  }

  const pageTitle = computed(() => t('chatRecord.titleWith', { name: chatRecordStore.peerName }))

  const typeFilters: { key: ChatRecordFilter; labelKey: string }[] = [
    { key: 'all', labelKey: 'chatRecord.filters.all' },
    { key: 'file', labelKey: 'chatRecord.filters.file' },
    { key: 'image', labelKey: 'chatRecord.filters.image' },
    { key: 'video', labelKey: 'chatRecord.filters.video' }
  ]

  const datePickerVisible = ref(false)
  const draftDateRange = ref<[number, number] | null>(null)
  const selectedDateRange = ref<[number, number] | null>(null)

  const dateRangeText = computed(() => {
    if (!selectedDateRange.value) return ''
    return formatDateRangeLabel(selectedDateRange.value)
  })

  const openDatePicker = () => {
    draftDateRange.value = selectedDateRange.value ? [selectedDateRange.value[0], selectedDateRange.value[1]] : null
    datePickerVisible.value = true
  }

  const closeDatePicker = () => {
    datePickerVisible.value = false
  }

  const onDateConfirm = (value: number | [number, number] | null) => {
    if (!value || !Array.isArray(value) || value.length !== 2) return
    selectedDateRange.value = [value[0], value[1]]
    draftDateRange.value = [value[0], value[1]]
    datePickerVisible.value = false
    activeFilter.value = 'date'
    loadMessages(true)
  }

  const onDateClear = () => {
    draftDateRange.value = null
    selectedDateRange.value = null
    datePickerVisible.value = false
    activeFilter.value = 'all'
  }

  const resolveMsgType = (filter: ChatRecordFilter): ChatRecordMsgType | undefined => {
    if (filter === 'file' || filter === 'image' || filter === 'video') {
      return filter
    }
    return undefined
  }

  const isSelf = (message: Message) => {
    const uid = userStore.authInfo.userId
    return !!uid && message.fromId === uid
  }

  const plainContentTypes = new Set(['image', 'video', 'sticker'])

  const isPlainContent = (message: Message) => plainContentTypes.has(message.msgType)

  const onForwardMessage = (message: Message) => {
    messageBubbleActions.forwardMessage(message)
  }

  const onDeleteMessage = (message: Message) => {
    messageBubbleActions.deleteMessage(message, {
      onBeforeDelete: (deletedMessage) => {
        messages.value = messages.value.filter((item) => item.id !== deletedMessage.id)
      }
    })
  }

  const resolveQueryDateRange = () => {
    if (activeFilter.value !== 'date' || !selectedDateRange.value) return undefined
    return toBackendDateRange(selectedDateRange.value)
  }

  const loadMessages = (reset = true) => {
    const sessionId = chatRecordStore.sessionId
    if (!sessionId) return

    const seq = ++loadSeq

    if (reset) {
      page.value = 0
      hasMore.value = false
    }

    loading.value = true
    const msgType = resolveMsgType(activeFilter.value)
    const dateRange = resolveQueryDateRange()
    const kw = keyword.value.trim() || undefined

    messageDbStore
      .loadMessagesFromDb(sessionId, 1, PAGE_SIZE, msgType, dateRange, kw)
      .then((result) => {
        if (seq !== loadSeq) return

        messages.value = result.records
        page.value = result.page
        hasMore.value = result.hasMore

        if (reset) {
          resetListScroll()
        }
      })
      .finally(() => {
        if (seq !== loadSeq) return
        loading.value = false
      })
  }

  const loadMore = () => {
    const sessionId = chatRecordStore.sessionId
    if (!sessionId || loading.value || loadingMore.value || !hasMore.value) return

    loadingMore.value = true
    const msgType = resolveMsgType(activeFilter.value)
    const dateRange = resolveQueryDateRange()
    const kw = keyword.value.trim() || undefined

    messageDbStore
      .loadMessagesFromDb(sessionId, page.value + 1, PAGE_SIZE, msgType, dateRange, kw)
      .then((result) => {
        messages.value.push(...result.records)
        page.value = result.page
        hasMore.value = result.hasMore
      })
      .finally(() => {
        loadingMore.value = false
      })
  }

  const onScroll = (e: Event) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return

    const distance = target.scrollHeight - target.scrollTop - target.clientHeight
    if (distance <= SCROLL_BOTTOM_THRESHOLD) {
      loadMore()
    }
  }

  watch(activeFilter, (newVal) => {
    if (newVal === 'date') return
    selectedDateRange.value = null
    draftDateRange.value = null
    loadMessages(true)
  })

  watch(
    () => chatRecordStore.sessionId,
    () => {
      messages.value = []
      loadMessages(true)
    }
  )

  const debouncedKeywordSearch = useDebounceFn(() => {
    loadMessages(true)
  }, 100)

  watch(keyword, () => {
    debouncedKeywordSearch()
  })

  onMounted(() => {
    loadMessages(true)
    nextTick(() => {
      ShowCurrentWindow()
    })
  })
</script>

<style scoped lang="scss">
  .chat-record {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background: var(--bg-secondary-color);
    user-select: none;

    :deep(*:focus) {
      outline: none;
    }

    :deep(*:focus-visible) {
      outline: none;
      box-shadow: none;
    }

    :deep(.n-input .n-input__state-border) {
      box-shadow: none !important;
    }

    :deep(.n-button:not(.n-button--disabled):focus),
    :deep(.n-button:not(.n-button--disabled):focus-visible) {
      box-shadow: none;
    }

    &__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      height: 38px;
      padding: 0 3px;
    }

    &__toolbar-side {
      flex: 1;
      min-width: 0;

      &--actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }
    }

    &__title {
      flex-shrink: 0;
      max-width: 60%;
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      text-align: center;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 12px 0 16px;
    }

    &__search {
      flex-shrink: 0;
      padding: 0 16px 12px;
    }

    &__search-input {
      --n-color: var(--input-soft-bg);
      --n-color-focus: var(--input-soft-bg);
      --n-border: 1px solid transparent;
      --n-border-hover: 1px solid transparent;
      --n-border-focus: 1px solid transparent;
      --n-box-shadow-focus: none;
      --n-text-color: var(--text-color);
      --n-placeholder-color: var(--text-secondary-color);
      --n-height: 36px;
      --n-border-radius: 20px;

      :deep(.n-input-wrapper) {
        display: flex;
        align-items: center;
        height: 36px;
        min-height: 36px;
        padding: 0 14px;
        background-color: var(--input-soft-bg);
        border-radius: 20px;
        box-sizing: border-box;
      }

      :deep(.n-input__prefix) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        height: 16px;
        margin-right: 8px;
      }

      :deep(.n-input__input) {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
        height: 16px;
      }

      :deep(.n-input__input-el) {
        height: 16px;
        line-height: 16px;
        padding: 0;
        font-size: 14px;
      }

      :deep(.n-input__placeholder) {
        font-size: 14px;
        line-height: 16px;
      }

      :deep(.n-input__suffix) {
        display: inline-flex;
        align-items: center;
      }
    }

    &__filters {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 0 16px 14px;
      overflow-x: auto;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    &__filter {
      flex-shrink: 0;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.4;
      color: var(--text-secondary-color);
      cursor: pointer;
      transition: color 0.15s ease;
      outline: none;
      box-shadow: none;

      &:focus,
      &:focus-visible {
        outline: none;
        box-shadow: none;
      }

      &:hover:not(&--active) {
        color: var(--text-color);
      }

      &--active {
        color: var(--primary-color);

        &:hover {
          color: var(--primary-color);
        }
      }

      &-date-range {
        margin-left: 4px;
        font-size: 12px;
        color: var(--text-secondary-color);
      }
    }

    &__date-modal {
      width: auto;
      max-width: calc(100vw - 32px);
      background: var(--bg-primary-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      color: var(--text-color);

      :deep(*:focus),
      :deep(*:focus-visible) {
        outline: none;
        box-shadow: none;
      }

      &-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--divider-color);
      }

      &-title {
        user-select: none;
        flex: 1;
        min-width: 0;
        font-size: 16px;
        font-weight: 500;
        line-height: 1.4;
        color: var(--text-color);
      }

      &-close {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--text-secondary-color);
        cursor: pointer;
        outline: none;
        box-shadow: none;
        transition:
          color 0.15s ease,
          background-color 0.15s ease;

        &:hover {
          color: var(--text-color);
          background: var(--icon-hover-color);
        }

        &:focus,
        &:focus-visible {
          outline: none;
          box-shadow: none;
        }
      }
    }

    &__date-picker {
      :deep(.n-date-panel) {
        background: var(--bg-primary-color);
        color: var(--text-color);
        box-shadow: none;
        border-radius: 0;
      }

      :deep(.n-date-panel-actions) {
        background: var(--bg-primary-color);
        border-top: 1px solid var(--divider-color);
      }

      :deep(.n-button:not(.n-button--disabled):focus),
      :deep(.n-button:not(.n-button--disabled):focus-visible) {
        box-shadow: none;
        outline: none;
      }
    }

    &__list {
      flex: 1;
      min-height: 0;
      padding-top: 4px;
      font-size: 12px;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }
    }

    &__item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;
      padding: 0 16px 20px;
    }

    &__item-avatar {
      flex-shrink: 0;
      border-radius: 4px;
      overflow: hidden;
    }

    &__item-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    &__item-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    &__item-name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__item-time {
      flex-shrink: 0;
      margin-left: auto;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__item-content {
      position: relative;
      display: flex;
      align-items: center;
      width: fit-content;
      max-width: 100%;
      border-radius: 8px;
      font-size: 14px;
      line-height: 0;
      background: var(--bg-primary-color);
      color: var(--text-color);
      word-break: break-word;

      &--text {
        box-sizing: border-box;
        width: fit-content;
        max-width: 70%;
        line-height: normal;
      }

      &--file,
      &--cloud-share,
      &--ecard {
        padding: 0;
        background: var(--bg-primary-color);
        color: var(--text-color);
        line-height: normal;
      }

      &--plain {
        padding: 0;
        background: transparent;
        color: inherit;
        line-height: normal;
      }

      :deep(.message-item) {
        max-width: min(72%, 520px);
      }

      :deep(.message-item--text) {
        max-width: 100%;
        width: fit-content;
      }

      :deep(.message-item--file),
      :deep(.message-item--cloud-share),
      :deep(.message-item--ecard) {
        width: 100%;
        max-width: 100%;
      }

      :deep(.message-text) {
        font-size: 14px;
        line-height: 1.5;
      }
    }

    &__status,
    &__empty {
      padding: 24px 20px;
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary-color);
    }
  }
</style>
