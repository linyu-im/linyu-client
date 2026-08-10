<template>
  <div ref="rootRef" class="contacts-search">
    <n-input
      v-model:value="keyword"
      size="small"
      type="text"
      class="contacts-search__input text-14px"
      :placeholder="placeholder"
      clearable
      @focus="onFocus"
      @keydown.esc="closePanel">
      <template #prefix>
        <svg class="size-16px text-[var(--text-secondary-color)]">
          <use href="#search"></use>
        </svg>
      </template>
    </n-input>

    <Teleport to="body">
      <div v-if="panelVisible" ref="panelRef" class="contacts-search-panel" :style="panelStyle">
        <n-spin :show="loading" class="contacts-search-panel__spin">
          <n-scrollbar
            class="contacts-search-panel__scroll"
            :style="{ maxHeight: `${panelMaxHeight}px` }"
            :theme-overrides="{ width: '6px' }">
            <div v-if="!loading && isEmpty" class="contacts-search-panel__empty">
              {{ t('contacts.search.empty') }}
            </div>

            <template v-else>
              <div v-if="friends.length > 0" class="contacts-search-panel__section">
                <div class="contacts-search-panel__section-title">{{ t('contacts.search.friends') }}</div>
                <div
                  v-for="item in visibleFriends"
                  :key="item.id"
                  class="contacts-search-panel__item"
                  :class="{ 'contacts-search-panel__item--disabled': openingPeerId === item.peerId }"
                  @click="onSelect(item, 'friend')">
                  <Avatar
                    class="contacts-search-panel__avatar size-34px rounded-5px bg-#FFF shrink-0"
                    :id="item.peerId" />
                  <div class="contacts-search-panel__content min-w-0 flex-1">
                    <div class="contacts-search-panel__name">
                      <span class="contacts-search-panel__name-text">
                        <template
                          v-for="(segment, index) in getHighlightSegments(getFriendName(item), searchedKeyword)"
                          :key="`friend-name-${item.id}-${index}`">
                          <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                            {{ segment.text }}
                          </span>
                        </template>
                      </span>
                      <span v-if="getFriendAccount(item)" class="contacts-search-panel__meta">
                        <span>(</span>
                        <template
                          v-for="(segment, index) in getHighlightSegments(getFriendAccount(item), searchedKeyword)"
                          :key="`friend-account-${item.id}-${index}`">
                          <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                            {{ segment.text }}
                          </span>
                        </template>
                        <span>)</span>
                      </span>
                    </div>
                    <div v-if="item.remark" class="contacts-search-panel__sub truncate">
                      <template
                        v-for="(segment, index) in getHighlightSegments(item.remark, searchedKeyword)"
                        :key="`friend-remark-${item.id}-${index}`">
                        <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                          {{ segment.text }}
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
                <button
                  v-if="!friendsExpanded && friends.length > PREVIEW_LIMIT"
                  type="button"
                  class="contacts-search-panel__view-all"
                  @click.stop="friendsExpanded = true">
                  {{ t('contacts.search.viewAll', { count: friends.length }) }}
                </button>
              </div>

              <div v-if="groups.length > 0" class="contacts-search-panel__section">
                <div class="contacts-search-panel__section-title">{{ t('contacts.search.groups') }}</div>
                <div
                  v-for="item in visibleGroups"
                  :key="item.id"
                  class="contacts-search-panel__item"
                  :class="{ 'contacts-search-panel__item--disabled': openingPeerId === item.peerId }"
                  @click="onSelect(item, 'group')">
                  <Avatar
                    class="contacts-search-panel__avatar size-34px rounded-5px bg-#FFF shrink-0"
                    type="group"
                    :id="item.peerId" />
                  <div class="contacts-search-panel__content min-w-0 flex-1">
                    <div class="contacts-search-panel__name">
                      <span class="contacts-search-panel__name-text">
                        <template
                          v-for="(segment, index) in getHighlightSegments(getGroupName(item), searchedKeyword)"
                          :key="`group-name-${item.id}-${index}`">
                          <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                            {{ segment.text }}
                          </span>
                        </template>
                      </span>
                      <span v-if="getGroupNumber(item)" class="contacts-search-panel__meta">
                        <span>(</span>
                        <template
                          v-for="(segment, index) in getHighlightSegments(getGroupNumber(item), searchedKeyword)"
                          :key="`group-number-${item.id}-${index}`">
                          <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                            {{ segment.text }}
                          </span>
                        </template>
                        <span>)</span>
                      </span>
                    </div>
                    <div v-if="item.remark" class="contacts-search-panel__sub truncate">
                      <template
                        v-for="(segment, index) in getHighlightSegments(item.remark, searchedKeyword)"
                        :key="`group-remark-${item.id}-${index}`">
                        <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                          {{ segment.text }}
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
                <button
                  v-if="!groupsExpanded && groups.length > PREVIEW_LIMIT"
                  type="button"
                  class="contacts-search-panel__view-all"
                  @click.stop="groupsExpanded = true">
                  {{ t('contacts.search.viewAll', { count: groups.length }) }}
                </button>
              </div>

              <div v-if="chatSessions.length > 0" class="contacts-search-panel__section">
                <div class="contacts-search-panel__section-title">{{ t('contacts.search.chatRecords') }}</div>
                <div
                  v-for="item in visibleChatSessions"
                  :key="item.sessionId"
                  class="contacts-search-panel__chat-item"
                  @click="onOpenChatRecords">
                  <Avatar
                    class="contacts-search-panel__avatar size-34px rounded-5px bg-#FFF shrink-0"
                    :id="resolveChatPeerId(item)"
                    :type="resolveChatSceneType(item)"
                    :round="false"
                    instant />
                  <div class="contacts-search-panel__chat-body min-w-0 flex-1">
                    <div class="contacts-search-panel__chat-top">
                      <Name
                        class="contacts-search-panel__chat-name truncate"
                        :id="resolveChatPeerId(item)"
                        :type="resolveChatSceneType(item)"
                        instant />
                      <time class="contacts-search-panel__chat-time">
                        {{ formatSessionListDate(item.latestCreatedAt, locale) }}
                      </time>
                    </div>
                    <div class="contacts-search-panel__chat-snippet truncate">
                      <template
                        v-for="(segment, index) in getHighlightSegments(
                          item.latestKeywordContent || '',
                          searchedKeyword
                        )"
                        :key="`${item.sessionId}-snippet-${index}`">
                        <span :class="{ 'contacts-search-panel__highlight': segment.highlight }">
                          {{ segment.text }}
                        </span>
                      </template>
                    </div>
                    <div class="contacts-search-panel__chat-count">
                      <i18n-t keypath="searchChatRecord.sessionMatchCount" tag="span">
                        <template #count>
                          <span class="contacts-search-panel__count-num">{{ item.matchCount }}</span>
                        </template>
                      </i18n-t>
                    </div>
                  </div>
                </div>
                <button
                  v-if="chatSessions.length > PREVIEW_LIMIT"
                  type="button"
                  class="contacts-search-panel__view-all"
                  @click.stop="onOpenChatRecords">
                  {{ t('contacts.search.viewAll', { count: chatSessions.length }) }}
                </button>
              </div>
            </template>
          </n-scrollbar>
        </n-spin>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { SceneType } from '@/constants/common'
  import type { SceneType as SceneTypeValue } from '@/constants/common'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useContactsStore } from '@/stores/user/contacts'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import { useUserStore } from '@/stores/user/user'
  import type { Contact } from '@/types/api/contacts'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { User } from '@/types/api/user'
  import type { MessageSessionSearchHit } from '@/db/message'
  import { getHighlightSegments } from '@/utils/common/highlight'
  import { formatSessionListDate } from '@/utils/common/time'
  import { openSearchChatRecord } from '@/utils/message/searchChatRecord'
  import { getGroupIdFromSessionId, getPeerIdFromUserSession, getSessionSceneType } from '@/utils/message/session'
  import { onClickOutside, useDebounceFn, useEventListener, useWindowSize } from '@vueuse/core'
  import type { CSSProperties } from 'vue'
  import { useI18n } from 'vue-i18n'

  defineOptions({ name: 'ContactsSearchPopover' })

  defineProps<{
    placeholder: string
  }>()

  const PREVIEW_LIMIT = 3
  const PANEL_WIDTH = 280
  const PANEL_GAP = 6
  const BOTTOM_GAP = 20
  const MIN_PANEL_HEIGHT = 80

  const { t, locale } = useI18n()
  const homeTabStore = useHomeTabStore()
  const contactsStore = useContactsStore()
  const peerInfoStore = usePeerInfoStore()
  const userStore = useUserStore()
  const messageDbStore = useMessageDbStore()
  const { height: windowHeight } = useWindowSize()

  const pickText = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      const text = value?.trim()
      if (text) return text
    }
    return ''
  }

  const getFriendName = (item: Contact) => pickText(item.username)

  const getFriendAccount = (item: Contact) => {
    const fromItem = pickText(item.account)
    if (fromItem) return fromItem
    void peerInfoStore.users
    const user = peerInfoStore.read(item.peerId, 'user') as User | null
    return pickText(user?.account)
  }

  const getGroupName = (item: Contact) => {
    const fromItem = pickText(item.groupName, item.name)
    if (fromItem) return fromItem
    void peerInfoStore.groups
    const group = peerInfoStore.read(item.peerId, 'group') as GroupInfoResult | null
    return pickText(group?.info?.name)
  }

  const getGroupNumber = (item: Contact) => {
    const fromItem = pickText(item.groupNumber, item.group_number)
    if (fromItem) return fromItem
    void peerInfoStore.groups
    const group = peerInfoStore.read(item.peerId, 'group') as GroupInfoResult | null
    return pickText(group?.info?.groupNumber)
  }

  const prefetchPeerInfo = (friendList: Contact[], groupList: Contact[]) => {
    friendList.forEach((item) => {
      if (item.peerId && !pickText(item.account)) {
        peerInfoStore.get(item.peerId, 'user')
      }
    })
    groupList.forEach((item) => {
      if (item.peerId && !pickText(item.groupNumber, item.group_number)) {
        peerInfoStore.get(item.peerId, 'group')
      }
    })
  }

  const ensureContactsLoaded = () => {
    contactsStore.fetchFriendList()
    contactsStore.fetchGroupList()
  }

  const rootRef = ref<HTMLElement | null>(null)
  const panelRef = ref<HTMLElement | null>(null)
  const keyword = ref('')
  const searchedKeyword = ref('')
  const panelVisible = ref(false)
  const friendsExpanded = ref(false)
  const groupsExpanded = ref(false)
  const openingPeerId = ref('')
  const panelLeft = ref(0)
  const panelTop = ref(0)
  const panelMaxHeight = ref(360)
  const chatSessions = ref<MessageSessionSearchHit[]>([])
  const chatLoading = ref(false)

  let chatSearchSeq = 0

  const currentUserId = computed(() => userStore.authInfo.userId?.trim() || '')

  const contactsLoading = computed(() => {
    if (!searchedKeyword.value) return false
    const friendsPending = contactsStore.friendList.length === 0 && contactsStore.friendListLoading
    const groupsPending = contactsStore.groupList.length === 0 && contactsStore.groupListLoading
    return friendsPending || groupsPending
  })

  const loading = computed(() => contactsLoading.value || chatLoading.value)

  const searchResult = computed(() => {
    void peerInfoStore.users
    void peerInfoStore.groups
    return contactsStore.search(searchedKeyword.value)
  })

  const friends = computed(() => searchResult.value.friends)
  const groups = computed(() => searchResult.value.groups)

  const isEmpty = computed(
    () => friends.value.length === 0 && groups.value.length === 0 && chatSessions.value.length === 0
  )

  const visibleFriends = computed(() => {
    if (friendsExpanded.value) return friends.value
    return friends.value.slice(0, PREVIEW_LIMIT)
  })

  const visibleGroups = computed(() => {
    if (groupsExpanded.value) return groups.value
    return groups.value.slice(0, PREVIEW_LIMIT)
  })

  const visibleChatSessions = computed(() => chatSessions.value.slice(0, PREVIEW_LIMIT))

  const panelStyle = computed<CSSProperties>(() => ({
    left: `${panelLeft.value}px`,
    top: `${panelTop.value}px`,
    width: `${PANEL_WIDTH}px`,
    maxHeight: `${panelMaxHeight.value}px`
  }))

  const resolveChatSceneType = (item: MessageSessionSearchHit): SceneTypeValue => {
    const sceneType = item.sceneType || getSessionSceneType(item.sessionId)
    return sceneType === SceneType.Group ? SceneType.Group : SceneType.User
  }

  const resolveChatPeerId = (item: MessageSessionSearchHit) => {
    if (resolveChatSceneType(item) === SceneType.Group) {
      return getGroupIdFromSessionId(item.sessionId)
    }
    return getPeerIdFromUserSession(item.sessionId, currentUserId.value)
  }

  const updatePanelPosition = () => {
    const anchor = rootRef.value
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    panelLeft.value = rect.left
    panelTop.value = rect.bottom + PANEL_GAP
    panelMaxHeight.value = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - panelTop.value - BOTTOM_GAP)
  }

  const resetResults = () => {
    friendsExpanded.value = false
    groupsExpanded.value = false
    searchedKeyword.value = ''
    chatSessions.value = []
    chatLoading.value = false
    chatSearchSeq += 1
  }

  const closePanel = () => {
    panelVisible.value = false
  }

  const clearAndClose = () => {
    keyword.value = ''
    resetResults()
    closePanel()
  }

  const openPanel = () => {
    updatePanelPosition()
    panelVisible.value = true
    nextTick(() => {
      updatePanelPosition()
    })
  }

  const runChatSearch = (trimmed: string) => {
    const seq = ++chatSearchSeq
    chatLoading.value = true
    chatSessions.value = []
    messageDbStore
      .searchSessionsByKeyword(trimmed)
      .then((result) => {
        if (seq !== chatSearchSeq) return
        chatSessions.value = result
      })
      .finally(() => {
        if (seq !== chatSearchSeq) return
        chatLoading.value = false
      })
  }

  const runSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      resetResults()
      closePanel()
      return
    }

    ensureContactsLoaded()
    friendsExpanded.value = false
    groupsExpanded.value = false
    searchedKeyword.value = trimmed
    openPanel()
    prefetchPeerInfo(contactsStore.friendList, contactsStore.groupList)
    runChatSearch(trimmed)
  }

  const debouncedSearch = useDebounceFn((value: string) => {
    runSearch(value)
  }, 200)

  const onFocus = () => {
    ensureContactsLoaded()
    if (keyword.value.trim()) {
      runSearch(keyword.value)
    }
  }

  const onSelect = (item: Contact, type: 'friend' | 'group') => {
    if (!item.peerId || openingPeerId.value) return
    openingPeerId.value = item.peerId
    const sceneType = type === 'friend' ? SceneType.User : SceneType.Group
    homeTabStore
      .openMessageWithPeer(item.peerId, sceneType)
      .then((ok) => {
        if (ok) clearAndClose()
      })
      .finally(() => {
        openingPeerId.value = ''
      })
  }

  const onOpenChatRecords = () => {
    const kw = searchedKeyword.value.trim()
    if (!kw) return
    openSearchChatRecord(kw)
    clearAndClose()
  }

  watch(keyword, (value) => {
    if (!value.trim()) {
      resetResults()
      closePanel()
      return
    }
    debouncedSearch(value)
  })

  watch([friends, groups], () => {
    if (!panelVisible.value || !searchedKeyword.value) return
    prefetchPeerInfo(friends.value, groups.value)
  })

  watch([windowHeight, panelVisible], () => {
    if (panelVisible.value) updatePanelPosition()
  })

  watch([friendsExpanded, groupsExpanded, chatSessions, chatLoading], () => {
    if (panelVisible.value) {
      nextTick(() => updatePanelPosition())
    }
  })

  useEventListener(window, 'resize', () => {
    if (panelVisible.value) updatePanelPosition()
  })

  onClickOutside(
    rootRef,
    () => {
      closePanel()
    },
    {
      ignore: [panelRef]
    }
  )
</script>

<style scoped lang="scss">
  .contacts-search {
    position: relative;
    flex: 1;
    min-width: 0;

    &__input {
      width: 100%;
      height: 28px;
    }
  }
</style>

<style lang="scss">
  .contacts-search-panel {
    position: fixed;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    box-sizing: border-box;

    &__spin {
      width: 100%;
      min-height: 80px;
      height: 100%;
      max-height: inherit;
      display: flex;
      flex-direction: column;

      .n-spin-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        max-height: inherit;
        overflow: hidden;
      }
    }

    &__scroll {
      flex: 1;
      min-height: 0;
      height: 100%;

      .n-scrollbar-content {
        padding: 4px 0;
        box-sizing: border-box;
      }
    }

    &__empty {
      padding: 24px 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__section {
      padding: 4px 0 4px;
    }

    &__section-title {
      padding: 4px 12px 6px;
      font-size: 12px;
      line-height: 1.2;
      color: var(--text-secondary-color);
      user-select: none;
    }

    &__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;

      &:hover {
        background: var(--button-soft-bg);
      }

      &--disabled {
        pointer-events: none;
        opacity: 0.7;
      }
    }

    &__content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__name {
      display: flex;
      align-items: baseline;
      gap: 0;
      min-width: 0;
      font-size: 14px;
      line-height: 1.3;
      color: var(--text-color);
    }

    &__name-text {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__meta {
      flex: 0 0 auto;
      margin-left: 2px;
      white-space: nowrap;
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary-color);
    }

    &__sub {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
    }

    &__highlight {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__count-num {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__chat-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;

      &:hover {
        background: var(--button-soft-bg);
      }
    }

    &__chat-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__chat-top {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    &__chat-name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      line-height: 1.3;
      color: var(--text-color);
    }

    &__chat-time {
      flex-shrink: 0;
      font-size: 11px;
      line-height: 1.3;
      color: var(--text-secondary-color);
    }

    &__chat-snippet {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
    }

    &__chat-count {
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
    }

    &__view-all {
      display: block;
      width: 100%;
      padding: 6px 12px;
      border: none;
      background: transparent;
      text-align: left;
      font-size: 12px;
      line-height: 1.4;
      color: var(--primary-color);
      cursor: pointer;

      &:hover {
        opacity: 0.85;
      }
    }
  }
</style>
