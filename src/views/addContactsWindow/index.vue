<template>
  <div class="add-contacts">
    <ToolBar class="add-contacts__toolbar">
      <div class="add-contacts__toolbar-side" data-tauri-drag-region />
      <h1 class="add-contacts__title" data-tauri-drag-region>{{ t('addContacts.title') }}</h1>
      <div class="add-contacts__toolbar-side add-contacts__toolbar-side--actions" data-tauri-drag-region>
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <div class="add-contacts__body">
      <div class="add-contacts__search">
        <n-input
          v-model:value="keyword"
          class="add-contacts__search-input"
          :placeholder="t('addContacts.searchPlaceholder')"
          clearable
          @keyup.enter="onSearch">
          <template #prefix>
            <svg class="size-16px text-[var(--text-secondary-color)]">
              <use href="#search" />
            </svg>
          </template>
        </n-input>
        <n-button class="add-contacts__search-btn" type="primary" @click="onSearch">
          {{ t('addContacts.search') }}
        </n-button>
      </div>

      <div class="add-contacts__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="add-contacts__tab"
          :class="{ 'add-contacts__tab--active': activeTab === tab.key }"
          @click="activeTab = tab.key">
          {{ t(tab.labelKey) }}
        </button>
      </div>

      <n-spin :show="isSearching" class="add-contacts__results-spin">
        <n-scrollbar ref="listScrollRef" class="add-contacts__results" @scroll="onListScroll">
          <template v-if="activeTab === 'user'">
            <div v-for="item in userList" :key="item.id" class="add-contacts__item">
              <Avatar class="add-contacts__avatar rounded-10px shrink-0" :id="item.id" round />
              <div class="add-contacts__content">
                <div class="add-contacts__name">
                  <span class="add-contacts__name-text">{{ item.username }}</span>
                  <span class="add-contacts__account">
                    (
                    <template
                      v-for="(segment, segmentIndex) in getHighlightSegments(item.account, searchedKeyword)"
                      :key="segmentIndex">
                      <span :class="{ 'add-contacts__highlight': segment.highlight }">{{ segment.text }}</span>
                    </template>
                    )
                  </span>
                </div>
                <div v-if="item.signature" class="add-contacts__desc">{{ item.signature }}</div>
              </div>
              <n-button
                class="add-contacts__action"
                :loading="sendingMessageUserId === item.id"
                @click.stop="onUserAction(item)">
                {{ isCurrentUser(item.id) ? t('addContacts.user.sendMessage') : t('addContacts.user.add') }}
              </n-button>
            </div>
          </template>

          <template v-else>
            <div v-for="item in groupList" :key="item.id" class="add-contacts__item">
              <Avatar class="add-contacts__avatar rounded-10px shrink-0" type="group" :id="item.id" />
              <div class="add-contacts__content">
                <div class="add-contacts__name">
                  <span class="add-contacts__name-text">
                    <template
                      v-for="(segment, segmentIndex) in getHighlightSegments(item.name, searchedKeyword)"
                      :key="`name-${segmentIndex}`">
                      <span :class="{ 'add-contacts__highlight': segment.highlight }">{{ segment.text }}</span>
                    </template>
                  </span>
                  <span class="add-contacts__account">
                    (
                    <template
                      v-for="(segment, segmentIndex) in getHighlightSegments(item.groupNumber, searchedKeyword)"
                      :key="`number-${segmentIndex}`">
                      <span :class="{ 'add-contacts__highlight': segment.highlight }">{{ segment.text }}</span>
                    </template>
                    )
                  </span>
                  <span class="add-contacts__meta-item add-contacts__name-meta">
                    <svg class="size-12px text-[var(--text-secondary-color)]">
                      <use href="#user" />
                    </svg>
                    {{ t('addContacts.group.memberCount', { count: item.memberNum }) }}
                  </span>
                </div>
                <div v-if="item.describe" class="add-contacts__desc">{{ item.describe }}</div>
              </div>
              <n-button class="add-contacts__action" @click.stop="onGroupAction(item)">
                {{ t('addContacts.group.join') }}
              </n-button>
            </div>
          </template>

          <div v-if="showEmptyHint" class="add-contacts__hint">{{ emptyDescription }}</div>
          <div v-else-if="isLoadingMore" class="add-contacts__hint add-contacts__hint--more">
            {{ t('addContacts.loadingMore') }}
          </div>
        </n-scrollbar>
      </n-spin>
    </div>

    <AddFriendApplyModal v-model:show="showAddFriendModal" :user="addFriendTargetUser" />
    <AddGroupApplyModal v-model:show="showAddGroupModal" :group="addGroupTargetGroup" />
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { chatApi, groupApi, userApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import { useChatStore } from '@/stores/chat/chat'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import { useUserStore } from '@/stores/user/user'
  import type { Group } from '@/types/api/group'
  import type { User } from '@/types/api/user'
  import { closeCurrentWindow, minimizeCurrentWindow, openAndFocusWindow, ShowCurrentWindow } from '@/utils/window'
  import AddFriendApplyModal from '@/components/Modal/AddFriendApplyModal.vue'
  import AddGroupApplyModal from '@/components/Modal/AddGroupApplyModal.vue'

  const { t } = useI18n()
  const userStore = useUserStore()
  const chatStore = useChatStore()
  const homeTabStore = useHomeTabStore()

  type AddContactsTab = 'user' | 'group'

  interface HighlightSegment {
    text: string
    highlight: boolean
  }

  const SEARCH_PAGE_SIZE = 10
  const SCROLL_BOTTOM_THRESHOLD = 48

  const keyword = ref('')
  const searchedKeyword = ref('')
  const activeTab = ref<AddContactsTab>('user')
  const userHasSearched = ref(false)
  const groupHasSearched = ref(false)
  const userList = ref<User[]>([])
  const groupList = ref<Group[]>([])
  const userPage = ref(1)
  const groupPage = ref(1)
  const userHasMore = ref(false)
  const groupHasMore = ref(false)
  const userSearching = ref(false)
  const groupSearching = ref(false)
  const userLoadingMore = ref(false)
  const groupLoadingMore = ref(false)
  const sendingMessageUserId = ref('')
  const showAddFriendModal = ref(false)
  const addFriendTargetUser = ref<User | null>(null)
  const showAddGroupModal = ref(false)
  const addGroupTargetGroup = ref<Group | null>(null)
  const listScrollRef = ref<{ scrollTo: (options: { top: number }) => void; $el?: HTMLElement } | null>(null)

  let userSearchSeq = 0
  let groupSearchSeq = 0

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')

  const isCurrentUser = (userId: string) => userId === currentUserId.value

  const tabs: { key: AddContactsTab; labelKey: string }[] = [
    { key: 'user', labelKey: 'addContacts.tabs.user' },
    { key: 'group', labelKey: 'addContacts.tabs.group' }
  ]

  const isSearching = computed(() => {
    return activeTab.value === 'user' ? userSearching.value : groupSearching.value
  })

  const isLoadingMore = computed(() => {
    return activeTab.value === 'user' ? userLoadingMore.value : groupLoadingMore.value
  })

  const showEmptyHint = computed(() => {
    if (isLoadingMore.value) return false
    if (activeTab.value === 'user') {
      if (userSearching.value) return false
      if (!userHasSearched.value) return true
      return userList.value.length === 0
    }
    if (groupSearching.value) return false
    if (!groupHasSearched.value) return true
    return groupList.value.length === 0
  })

  const emptyDescription = computed(() => {
    if (activeTab.value === 'user') {
      return userHasSearched.value ? t('addContacts.noResultUser') : t('addContacts.empty')
    }
    return groupHasSearched.value ? t('addContacts.noResultGroup') : t('addContacts.empty')
  })

  const getHighlightSegments = (text: string, keywordText: string): HighlightSegment[] => {
    if (!text) return []
    const trimmedKeyword = keywordText.trim()
    if (!trimmedKeyword) {
      return [{ text, highlight: false }]
    }

    const lowerText = text.toLowerCase()
    const lowerKeyword = trimmedKeyword.toLowerCase()
    const highlightIndices = new Set<number>()
    let keywordIndex = 0

    for (let textIndex = 0; textIndex < lowerText.length && keywordIndex < lowerKeyword.length; textIndex++) {
      if (lowerText[textIndex] === lowerKeyword[keywordIndex]) {
        highlightIndices.add(textIndex)
        keywordIndex++
      }
    }

    const segments: HighlightSegment[] = []
    let start = 0

    while (start < text.length) {
      const highlighted = highlightIndices.has(start)
      let end = start + 1
      while (end < text.length && highlightIndices.has(end) === highlighted) {
        end++
      }
      segments.push({ text: text.slice(start, end), highlight: highlighted })
      start = end
    }

    return segments
  }

  const resetListScroll = () => {
    nextTick(() => {
      listScrollRef.value?.scrollTo({ top: 0 })
    })
  }

  const getListScrollContainer = () => {
    const root = listScrollRef.value?.$el
    if (!(root instanceof HTMLElement)) return null
    return root.querySelector<HTMLElement>('.n-scrollbar-container')
  }

  const tryFillList = () => {
    const container = getListScrollContainer()
    if (!container) return

    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    if (distance > SCROLL_BOTTOM_THRESHOLD) return

    if (activeTab.value === 'user') {
      if (userHasMore.value) loadUsers(false)
      return
    }
    if (groupHasMore.value) loadGroups(false)
  }

  const onListScroll = (e: Event) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return

    const distance = target.scrollHeight - target.scrollTop - target.clientHeight
    if (distance > SCROLL_BOTTOM_THRESHOLD) return

    if (activeTab.value === 'user') {
      loadUsers(false)
      return
    }
    loadGroups(false)
  }

  const loadUsers = (reset: boolean) => {
    const trimmed = keyword.value.trim()
    if (!trimmed) {
      userList.value = []
      searchedKeyword.value = ''
      userHasSearched.value = false
      userHasMore.value = false
      userPage.value = 1
      return
    }

    if (!reset) {
      if (!userHasMore.value || userSearching.value || userLoadingMore.value) return
      userLoadingMore.value = true
    } else {
      searchedKeyword.value = trimmed
      userPage.value = 1
      userHasMore.value = false
    }

    const seq = reset ? ++userSearchSeq : userSearchSeq
    const page = reset ? 1 : userPage.value + 1
    if (reset) userSearching.value = true

    userApi
      .search({ keyword: trimmed, page, pageSize: SEARCH_PAGE_SIZE })
      .then((res) => {
        if (reset && seq !== userSearchSeq) return
        if (res.code === 0 && res.data) {
          if (reset) {
            userList.value = res.data.records
            resetListScroll()
          } else {
            userList.value.push(...res.data.records)
          }
          userPage.value = res.data.page
          userHasMore.value = res.data.page < res.data.totalPage
          userHasSearched.value = true
        } else {
          if (reset) userList.value = []
          if (res.msg) window.$message.error(res.msg)
        }
      })
      .finally(() => {
        if (reset && seq !== userSearchSeq) return
        userSearching.value = false
        userLoadingMore.value = false
        nextTick(() => {
          if (userHasMore.value) tryFillList()
        })
      })
  }

  const loadGroups = (reset: boolean) => {
    const trimmed = keyword.value.trim()
    if (!trimmed) {
      groupList.value = []
      searchedKeyword.value = ''
      groupHasSearched.value = false
      groupHasMore.value = false
      groupPage.value = 1
      return
    }

    if (!reset) {
      if (!groupHasMore.value || groupSearching.value || groupLoadingMore.value) return
      groupLoadingMore.value = true
    } else {
      searchedKeyword.value = trimmed
      groupPage.value = 1
      groupHasMore.value = false
    }

    const seq = reset ? ++groupSearchSeq : groupSearchSeq
    const page = reset ? 1 : groupPage.value + 1
    if (reset) groupSearching.value = true

    groupApi
      .search({ keyword: trimmed, page, pageSize: SEARCH_PAGE_SIZE })
      .then((res) => {
        if (reset && seq !== groupSearchSeq) return
        if (res.code === 0 && res.data) {
          if (reset) {
            groupList.value = res.data.records
            resetListScroll()
          } else {
            groupList.value.push(...res.data.records)
          }
          groupPage.value = res.data.page
          groupHasMore.value = res.data.page < res.data.totalPage
          groupHasSearched.value = true
        } else {
          if (reset) groupList.value = []
          if (res.msg) window.$message.error(res.msg)
        }
      })
      .finally(() => {
        if (reset && seq !== groupSearchSeq) return
        groupSearching.value = false
        groupLoadingMore.value = false
        nextTick(() => {
          if (groupHasMore.value) tryFillList()
        })
      })
  }

  const searchUsers = () => {
    loadUsers(true)
  }

  const searchGroups = () => {
    loadGroups(true)
  }

  const onSearch = () => {
    if (activeTab.value === 'user') {
      searchUsers()
      return
    }
    searchGroups()
  }

  const onSendMessage = (userId: string) => {
    if (sendingMessageUserId.value || !userId) return

    sendingMessageUserId.value = userId
    chatApi.create({ peerId: userId, sceneType: SceneType.User }).then((res) => {
      if (res.code !== 0 || !res.data) {
        window.$message.error(res.msg)
        sendingMessageUserId.value = ''
        return
      }

      const chatId = res.data.id
      return chatStore
        .loadList()
        .then(() => {
          chatStore.setSelectedChatId(chatId)
          chatStore.markReopen()
          homeTabStore.$patch((state) => {
            state.activeTabId = 'message'
          })
          homeTabStore.setTabPayload('message', { chatId })
          return openAndFocusWindow('home')
        })
        .finally(() => {
          sendingMessageUserId.value = ''
        })
    })
  }

  const onUserAction = (item: User) => {
    if (isCurrentUser(item.id)) {
      onSendMessage(item.id)
      return
    }
    addFriendTargetUser.value = item
    showAddFriendModal.value = true
  }

  const onGroupAction = (item: Group) => {
    addGroupTargetGroup.value = item
    showAddGroupModal.value = true
  }

  watch(activeTab, (tab) => {
    if (!keyword.value.trim()) return
    if (tab === 'user') {
      searchUsers()
      return
    }
    searchGroups()
  })

  onMounted(() => {
    nextTick(() => {
      ShowCurrentWindow()
    })
  })
</script>

<style scoped lang="scss">
  .add-contacts {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background: var(--bg-primary-color);
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
      background: var(--bg-primary-color);
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
      padding: 16px 0 0;
    }

    &__search {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 20px 16px;
    }

    &__search-input {
      flex: 1;
      min-width: 0;
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

      :deep(.n-input__input-el) {
        height: 16px;
        line-height: 16px;
        padding: 0;
        font-size: 14px;
      }
    }

    &__search-btn {
      flex-shrink: 0;
      min-width: 72px;
      height: 36px;
      padding: 0 18px;
      border-radius: 18px;
      font-size: 14px;
    }

    &__tabs {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 28px;
      padding: 0 20px;
      border-bottom: 1px solid var(--divider-color);
    }

    &__tab {
      position: relative;
      padding: 0 0 12px;
      border: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.4;
      color: var(--text-secondary-color);
      cursor: pointer;
      transition: color 0.15s ease;

      &:hover:not(&--active) {
        color: var(--text-color);
      }

      &--active {
        color: var(--text-color);
        font-weight: 500;

        &::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          border-radius: 1px;
          background: var(--primary-color);
        }
      }
    }

    &__results-spin {
      flex: 1;
      min-height: 0;

      :deep(.n-spin-content) {
        height: 100%;
      }
    }

    &__results {
      flex: 1;
      min-height: 0;
    }

    &__item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: var(--bg-secondary-color);
      }
    }

    &__avatar {
      width: 48px;
      height: 48px;
    }

    &__content {
      flex: 1;
      min-width: 0;
    }

    &__name {
      display: flex;
      align-items: baseline;
      min-width: 0;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__name-text {
      flex-shrink: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__account {
      flex-shrink: 1;
      min-width: 0;
      font-size: 13px;
      font-weight: 400;
      color: var(--text-secondary-color);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__name-meta {
      flex-shrink: 0;
      margin-left: 8px;
      font-size: 12px;
      font-weight: 400;
    }

    &__highlight {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
    }

    &__desc {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__hint {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: 48px 20px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary-color);
      text-align: center;

      &--more {
        min-height: auto;
        padding: 16px 20px 24px;
      }
    }

    &__action {
      flex-shrink: 0;
      min-width: 64px;
      height: 32px;
      padding: 0 16px;
      border-radius: 8px;
      font-size: 13px;
      --n-color: var(--bg-primary-color);
      --n-color-hover: var(--bg-secondary-color);
      --n-color-pressed: var(--bg-secondary-color);
      --n-border: 1px solid var(--border-color);
      --n-border-hover: 1px solid var(--border-color);
      --n-border-pressed: 1px solid var(--border-color);
      --n-text-color: var(--text-color);
      --n-text-color-hover: var(--text-color);
      --n-text-color-pressed: var(--text-color);
    }
  }
</style>
