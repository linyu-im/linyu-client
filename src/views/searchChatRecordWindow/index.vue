<template>
  <div class="search-chat-record">
    <ToolBar class="search-chat-record__toolbar">
      <div class="search-chat-record__toolbar-side" data-tauri-drag-region />
      <h1 class="search-chat-record__title" data-tauri-drag-region>{{ t('searchChatRecord.title') }}</h1>
      <div class="search-chat-record__toolbar-side search-chat-record__toolbar-side--actions" data-tauri-drag-region>
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <div class="search-chat-record__body">
      <div class="search-chat-record__search">
        <n-input
          v-model:value="keyword"
          class="search-chat-record__search-input"
          :placeholder="t('searchChatRecord.searchPlaceholder')"
          clearable>
          <template #prefix>
            <svg class="size-16px text-[var(--text-secondary-color)]">
              <use href="#search" />
            </svg>
          </template>
        </n-input>
      </div>

      <div class="search-chat-record__main">
        <n-spin v-if="!showResultPanel" :show="sessionLoading" class="search-chat-record__empty-spin">
          <LinyuEmpty class="search-chat-record__empty search-chat-record__empty--full" :size="160" />
        </n-spin>
        <template v-else>
          <aside class="search-chat-record__sider">
            <n-spin :show="sessionLoading" class="search-chat-record__spin">
              <n-scrollbar class="search-chat-record__session-scroll">
                <button
                  v-for="item in sessions"
                  :key="item.sessionId"
                  type="button"
                  class="search-chat-record__session"
                  :class="{ 'search-chat-record__session--active': selectedSessionId === item.sessionId }"
                  @click="onSelectSession(item)">
                  <Avatar
                    class="search-chat-record__session-avatar shrink-0"
                    :id="resolvePeerId(item)"
                    :type="item.sceneType"
                    :size="32"
                    :round="false"
                    instant />
                  <div class="search-chat-record__session-body min-w-0 flex-1">
                    <div class="search-chat-record__session-top">
                      <Name
                        class="search-chat-record__session-name truncate"
                        :id="resolvePeerId(item)"
                        :type="item.sceneType"
                        instant />
                      <time class="search-chat-record__session-time">
                        {{ formatSessionListDate(item.latestCreatedAt, locale) }}
                      </time>
                    </div>
                    <div class="search-chat-record__session-snippet truncate">
                      <template
                        v-for="(segment, index) in getHighlightSegments(
                          item.latestKeywordContent || '',
                          searchedKeyword
                        )"
                        :key="`${item.sessionId}-snippet-${index}`">
                        <span :class="{ 'search-chat-record__highlight': segment.highlight }">{{ segment.text }}</span>
                      </template>
                    </div>
                    <div class="search-chat-record__session-count">
                      <i18n-t keypath="searchChatRecord.sessionMatchCount" tag="span">
                        <template #count>
                          <span class="search-chat-record__count-num">{{ item.matchCount }}</span>
                        </template>
                      </i18n-t>
                    </div>
                  </div>
                </button>
              </n-scrollbar>
            </n-spin>
          </aside>

          <section class="search-chat-record__detail">
            <template v-if="selectedSession">
              <div class="search-chat-record__detail-header">
                <div class="search-chat-record__detail-title truncate">
                  <i18n-t keypath="searchChatRecord.detailMatchCount" tag="span">
                    <template #count>
                      <span class="search-chat-record__count-num">{{ selectedSession.matchCount }}</span>
                    </template>
                    <template #keyword>
                      <span>{{ searchedKeyword }}</span>
                    </template>
                  </i18n-t>
                </div>
                <button type="button" class="search-chat-record__enter" @click="onEnterChat">
                  {{ t('searchChatRecord.enterChat') }}
                  <svg class="size-12px">
                    <use href="#right-arrow" />
                  </svg>
                </button>
              </div>

              <n-spin :show="messageLoading" class="search-chat-record__spin">
                <n-scrollbar
                  ref="messageScrollRef"
                  class="search-chat-record__message-scroll"
                  @scroll="onMessageScroll">
                  <template v-if="messages.length > 0">
                    <article v-for="message in messages" :key="message.id" class="search-chat-record__message">
                      <Avatar
                        class="search-chat-record__message-avatar"
                        :id="message.fromId"
                        :type="message.fromType"
                        :size="36"
                        :round="false"
                        instant
                        :profile-enabled="message.fromType === 'user'" />
                      <div class="search-chat-record__message-body">
                        <div class="search-chat-record__message-meta">
                          <Name
                            class="search-chat-record__message-name"
                            :id="message.fromId"
                            :type="message.fromType ?? 'user'"
                            instant />
                          <time class="search-chat-record__message-time">
                            {{ formatChatRecordDateTime(message.createdAt, locale) }}
                          </time>
                        </div>
                        <div
                          class="search-chat-record__message-content"
                          :class="{
                            'search-chat-record__message-content--plain': isPlainContent(message),
                            'search-chat-record__message-content--text': message.msgType === 'text',
                            'search-chat-record__message-content--file': message.msgType === 'file',
                            'search-chat-record__message-content--cloud-share': message.msgType === 'cloud_share',
                            'search-chat-record__message-content--ecard': message.msgType === 'ecard'
                          }">
                          <Item
                            :message="message"
                            :is-self="isSelf(message)"
                            menu-preset="record"
                            :highlight-keyword="searchedKeyword"
                            @forward="onForwardMessage"
                            @delete="onDeleteMessage" />
                        </div>
                      </div>
                    </article>
                    <div v-if="messageLoadingMore" class="search-chat-record__hint search-chat-record__hint--more">
                      {{ t('searchChatRecord.loadingMore') }}
                    </div>
                  </template>
                  <div v-else-if="!messageLoading" class="search-chat-record__hint">
                    {{ t('searchChatRecord.emptyMessages') }}
                  </div>
                </n-scrollbar>
              </n-spin>
            </template>
            <LinyuEmpty v-else class="search-chat-record__empty" :size="120" />
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useDebounceFn } from '@vueuse/core'
  import Item from '@/components/Message/MessageList/Item/index.vue'
  import { SceneType } from '@/constants/common'
  import type { SceneType as SceneTypeValue } from '@/constants/common'
  import { useMessageBubbleActions } from '@/composables/useMessageBubbleActions'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import { useSearchChatRecordStore } from '@/stores/chat/searchChatRecord'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useUserStore } from '@/stores/user/user'
  import type { MessageSessionSearchHit } from '@/db/message'
  import type { Message } from '@/types/api/message'
  import { getHighlightSegments } from '@/utils/common/highlight'
  import { formatChatRecordDateTime, formatSessionListDate } from '@/utils/common/time'
  import {
    closeCurrentWindow,
    createHomeWinodw,
    minimizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'
  import { getGroupIdFromSessionId, getPeerIdFromUserSession, getSessionSceneType } from '@/utils/message/session'

  defineOptions({ name: 'searchChatRecord' })

  const { t, locale } = useI18n()
  const messageDbStore = useMessageDbStore()
  const userStore = useUserStore()
  const homeTabStore = useHomeTabStore()
  const searchChatRecordStore = useSearchChatRecordStore()
  const messageBubbleActions = useMessageBubbleActions()

  const PAGE_SIZE = 20
  const SCROLL_BOTTOM_THRESHOLD = 48

  const keyword = ref('')
  const searchedKeyword = ref('')
  const sessions = ref<MessageSessionSearchHit[]>([])
  const selectedSessionId = ref('')
  const sessionLoading = ref(false)
  const messages = ref<Message[]>([])
  const messagePage = ref(0)
  const messageHasMore = ref(false)
  const messageLoading = ref(false)
  const messageLoadingMore = ref(false)
  const enteringChat = ref(false)
  const messageScrollRef = ref<{ scrollTo: (options: { top: number }) => void } | null>(null)

  let sessionSearchSeq = 0
  let messageLoadSeq = 0

  const currentUserId = computed(() => userStore.authInfo.userId?.trim() || '')

  const selectedSession = computed(() => sessions.value.find((item) => item.sessionId === selectedSessionId.value))

  const showResultPanel = computed(() => sessions.value.length > 0)

  const plainContentTypes = new Set(['image', 'video', 'sticker'])

  const isPlainContent = (message: Message) => plainContentTypes.has(message.msgType)

  const isSelf = (message: Message) => {
    const uid = currentUserId.value
    return !!uid && message.fromId === uid
  }

  const resolvePeerId = (item: MessageSessionSearchHit) => {
    const sceneType = (item.sceneType || getSessionSceneType(item.sessionId)) as SceneTypeValue
    if (sceneType === SceneType.Group) {
      return getGroupIdFromSessionId(item.sessionId)
    }
    return getPeerIdFromUserSession(item.sessionId, currentUserId.value)
  }

  const resolveSceneType = (item: MessageSessionSearchHit): SceneTypeValue => {
    const sceneType = item.sceneType || getSessionSceneType(item.sessionId)
    return sceneType === SceneType.Group ? SceneType.Group : SceneType.User
  }

  const resetMessageScroll = () => {
    nextTick(() => {
      messageScrollRef.value?.scrollTo({ top: 0 })
    })
  }

  const clearDetail = () => {
    selectedSessionId.value = ''
    messages.value = []
    messagePage.value = 0
    messageHasMore.value = false
  }

  const runSessionSearch = (value: string) => {
    const trimmed = value.trim()
    const seq = ++sessionSearchSeq

    if (!trimmed) {
      searchedKeyword.value = ''
      sessions.value = []
      clearDetail()
      sessionLoading.value = false
      return
    }

    sessionLoading.value = true
    searchedKeyword.value = trimmed
    clearDetail()

    messageDbStore
      .searchSessionsByKeyword(trimmed)
      .then((result) => {
        if (seq !== sessionSearchSeq) return
        sessions.value = result
      })
      .finally(() => {
        if (seq !== sessionSearchSeq) return
        sessionLoading.value = false
      })
  }

  const debouncedSearch = useDebounceFn((value: string) => {
    runSessionSearch(value)
  }, 200)

  const loadMessages = (sessionId: string, reset = true) => {
    const kw = searchedKeyword.value
    if (!sessionId || !kw) return

    const seq = ++messageLoadSeq
    if (reset) {
      messagePage.value = 0
      messageHasMore.value = false
      messageLoading.value = true
    }

    messageDbStore
      .loadMessagesFromDb(sessionId, 1, PAGE_SIZE, undefined, undefined, kw)
      .then((result) => {
        if (seq !== messageLoadSeq) return
        messages.value = result.records
        messagePage.value = result.page
        messageHasMore.value = result.hasMore
        if (reset) resetMessageScroll()
      })
      .finally(() => {
        if (seq !== messageLoadSeq) return
        messageLoading.value = false
      })
  }

  const loadMoreMessages = () => {
    const sessionId = selectedSessionId.value
    const kw = searchedKeyword.value
    if (!sessionId || !kw || messageLoading.value || messageLoadingMore.value || !messageHasMore.value) return

    messageLoadingMore.value = true
    messageDbStore
      .loadMessagesFromDb(sessionId, messagePage.value + 1, PAGE_SIZE, undefined, undefined, kw)
      .then((result) => {
        messages.value.push(...result.records)
        messagePage.value = result.page
        messageHasMore.value = result.hasMore
      })
      .finally(() => {
        messageLoadingMore.value = false
      })
  }

  const onMessageScroll = (e: Event) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    const distance = target.scrollHeight - target.scrollTop - target.clientHeight
    if (distance <= SCROLL_BOTTOM_THRESHOLD) {
      loadMoreMessages()
    }
  }

  const onSelectSession = (item: MessageSessionSearchHit) => {
    selectedSessionId.value = item.sessionId
    loadMessages(item.sessionId, true)
  }

  const refreshSelectedSessionCount = () => {
    const kw = searchedKeyword.value
    if (!kw) return
    messageDbStore.searchSessionsByKeyword(kw).then((result) => {
      sessions.value = result
      if (!result.some((item) => item.sessionId === selectedSessionId.value)) {
        clearDetail()
      }
    })
  }

  const onForwardMessage = (message: Message) => {
    messageBubbleActions.forwardMessage(message)
  }

  const onDeleteMessage = (message: Message) => {
    messageBubbleActions.deleteMessage(message, {
      onBeforeDelete: (deletedMessage) => {
        messages.value = messages.value.filter((item) => item.id !== deletedMessage.id)
      },
      onDeleted: () => {
        refreshSelectedSessionCount()
      }
    })
  }

  const onEnterChat = () => {
    const session = selectedSession.value
    if (!session || enteringChat.value) return
    const peerId = resolvePeerId(session)
    if (!peerId) return

    enteringChat.value = true
    const sceneType = resolveSceneType(session)
    createHomeWinodw()
      .then(() => homeTabStore.openMessageWithPeer(peerId, sceneType).then((): void => {}))
      .finally(() => {
        enteringChat.value = false
      })
  }

  watch(keyword, (value) => {
    if (!value.trim()) {
      sessionSearchSeq += 1
      searchedKeyword.value = ''
      sessions.value = []
      clearDetail()
      sessionLoading.value = false
      return
    }
    debouncedSearch(value)
  })

  watch(
    () => searchChatRecordStore.keyword,
    (kw) => {
      const trimmed = kw.trim()
      if (!trimmed) return
      if (keyword.value === trimmed) {
        if (searchedKeyword.value !== trimmed) {
          runSessionSearch(trimmed)
        }
        return
      }
      keyword.value = trimmed
    },
    { immediate: true }
  )

  onMounted(() => {
    ShowCurrentWindow()
  })
</script>

<style scoped lang="scss">
  .search-chat-record {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background: var(--bg-content-color);
    user-select: none;

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
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      padding: 6px 8px 8px;
    }

    &__search {
      flex-shrink: 0;
      padding: 0 0 6px;
    }

    &__search-input {
      width: 100%;
      --n-color: var(--input-soft-bg);
      --n-color-focus: var(--input-soft-bg);
      --n-border: 1px solid transparent;
      --n-border-hover: 1px solid transparent;
      --n-border-focus: 1px solid transparent;
      --n-box-shadow-focus: none;
      --n-text-color: var(--text-color);
      --n-placeholder-color: var(--text-secondary-color);
      --n-height: 32px;
      --n-border-radius: 16px;

      :deep(.n-input-wrapper) {
        display: flex;
        align-items: center;
        height: 32px;
        min-height: 32px;
        padding: 0 10px;
        background-color: var(--input-soft-bg);
        border-radius: 16px;
        box-sizing: border-box;
      }

      :deep(.n-input__prefix) {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        height: 16px;
        margin-right: 6px;
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
        font-size: 13px;
      }

      :deep(.n-input__placeholder) {
        font-size: 13px;
        line-height: 16px;
      }
    }

    &__main {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      background: var(--bg-secondary-color);
      border-radius: 6px;
    }

    &__sider {
      display: flex;
      flex-direction: column;
      width: 240px;
      flex-shrink: 0;
      min-height: 0;
      height: 100%;
      border-right: 1px solid var(--border-color);
      background: var(--bg-secondary-color);
    }

    &__detail {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      min-height: 0;
      height: 100%;
      background: var(--bg-content-color);
    }

    &__empty {
      flex: 1;
      min-height: 0;
      background: var(--bg-secondary-color);

      &--full {
        width: 100%;
        background: var(--bg-secondary-color);
      }
    }

    &__empty-spin {
      flex: 1;
      width: 100%;
      min-height: 0;
      height: 100%;

      :deep(.n-spin-container),
      :deep(.n-spin-content) {
        height: 100%;
        min-height: 0;
      }
    }

    &__spin {
      flex: 1;
      width: 100%;
      min-height: 0;
      height: 100%;
      display: flex;
      flex-direction: column;

      :deep(.n-spin-container),
      :deep(.n-spin-content) {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;
      }
    }

    &__session-scroll,
    &__message-scroll {
      flex: 1;
      min-height: 0;
      height: 100%;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }
    }

    &__hint {
      padding: 12px 8px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary-color);

      &--more {
        padding: 6px 8px 10px;
      }
    }

    &__session {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      width: 100%;
      padding: 6px 8px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      color: inherit;

      &:hover {
        background: var(--button-soft-bg);
      }

      &--active {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
      }
    }

    &__session-avatar {
      border-radius: 4px;
      overflow: hidden;
    }

    &__session-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__session-top {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    &__session-name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      line-height: 1.3;
      color: var(--text-color);
    }

    &__session-time {
      flex-shrink: 0;
      font-size: 11px;
      color: var(--text-secondary-color);
    }

    &__session-snippet {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
    }

    &__session-count {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
    }

    &__count-num {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__highlight {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      flex-shrink: 0;
      padding: 6px 10px;
      border-bottom: 1px solid var(--border-color);
    }

    &__detail-title {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__enter {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 12px;
      color: var(--primary-color);
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }

    &__message {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;
      padding: 0 16px 20px;

      &:first-child {
        padding-top: 4px;
      }
    }

    &__message-avatar {
      flex-shrink: 0;
      border-radius: 4px;
      overflow: hidden;
    }

    &__message-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    &__message-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    &__message-name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__message-time {
      flex-shrink: 0;
      margin-left: auto;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__message-content {
      position: relative;
      display: flex;
      align-items: center;
      width: fit-content;
      max-width: 100%;
      border-radius: 8px;
      font-size: 14px;
      line-height: 0;
      background: var(--message-card-bg);
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
        background: var(--message-card-bg);
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

      :deep(.message-item--plain) {
        max-width: 560px;
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
  }
</style>
