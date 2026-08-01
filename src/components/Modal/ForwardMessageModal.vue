<template>
  <div class="forward-modal">
    <div class="forward-modal__left">
      <n-input
        v-model:value="searchKeyword"
        size="small"
        clearable
        class="forward-modal__search"
        :placeholder="t('message.forward.search')">
        <template #prefix>
          <svg class="forward-modal__search-icon" aria-hidden="true">
            <use href="#search" />
          </svg>
        </template>
      </n-input>

      <n-scrollbar class="forward-modal__list-scroll">
        <div class="forward-modal__list">
          <div class="forward-modal__section">
            <button type="button" class="forward-modal__section-head" @click="toggleSection('group')">
              <span class="forward-modal__section-left">
                <svg
                  class="forward-modal__section-arrow"
                  :class="{ 'forward-modal__section-arrow--expanded': expandedSections.group }"
                  aria-hidden="true">
                  <use href="#right-arrow" />
                </svg>
                <span>{{ t('contacts.menu.myGroup') }}</span>
              </span>
            </button>
            <template v-if="expandedSections.group">
              <div v-if="groupListLoading" class="forward-modal__section-hint">{{ t('contacts.loading') }}</div>
              <div v-else-if="filteredGroups.length === 0" class="forward-modal__section-hint">
                {{ searchKeyword ? t('message.forward.noSearchResult') : t('contacts.emptyGroups') }}
              </div>
              <template v-else>
                <div
                  v-for="contact in filteredGroups"
                  :key="contact.id"
                  role="button"
                  tabindex="0"
                  class="forward-modal__chat-item"
                  :class="{ 'forward-modal__chat-item--active': isChatSelected(contact.id) }"
                  @click="toggleChat(contact.id)"
                  @keydown.enter.prevent="toggleChat(contact.id)"
                  @keydown.space.prevent="toggleChat(contact.id)">
                  <n-checkbox class="forward-modal__checkbox" :checked="isChatSelected(contact.id)" />
                  <Avatar :id="contact.peerId" type="group" class="forward-modal__avatar" />
                  <span class="forward-modal__chat-name">{{ getGroupDisplayName(contact) }}</span>
                </div>
              </template>
            </template>
          </div>

          <div class="forward-modal__section">
            <button type="button" class="forward-modal__section-head" @click="toggleSection('friend')">
              <span class="forward-modal__section-left">
                <svg
                  class="forward-modal__section-arrow"
                  :class="{ 'forward-modal__section-arrow--expanded': expandedSections.friend }"
                  aria-hidden="true">
                  <use href="#right-arrow" />
                </svg>
                <span>{{ t('contacts.menu.myFriends') }}</span>
              </span>
            </button>
            <template v-if="expandedSections.friend">
              <div v-if="friendListLoading" class="forward-modal__section-hint">{{ t('contacts.loading') }}</div>
              <div v-else-if="filteredFriends.length === 0" class="forward-modal__section-hint">
                {{ searchKeyword ? t('message.forward.noSearchResult') : t('contacts.emptyFriends') }}
              </div>
              <template v-else>
                <div
                  v-for="contact in filteredFriends"
                  :key="contact.id"
                  role="button"
                  tabindex="0"
                  class="forward-modal__chat-item"
                  :class="{ 'forward-modal__chat-item--active': isChatSelected(contact.id) }"
                  @click="toggleChat(contact.id)"
                  @keydown.enter.prevent="toggleChat(contact.id)"
                  @keydown.space.prevent="toggleChat(contact.id)">
                  <n-checkbox class="forward-modal__checkbox" :checked="isChatSelected(contact.id)" />
                  <Avatar :id="contact.peerId" class="forward-modal__avatar" />
                  <span class="forward-modal__chat-name">{{ getFriendDisplayName(contact) }}</span>
                </div>
              </template>
            </template>
          </div>
        </div>
      </n-scrollbar>
    </div>

    <div class="forward-modal__right">
      <div class="forward-modal__right-head">
        {{ t('message.forward.sendTo') }}
      </div>

      <n-scrollbar class="forward-modal__selected-scroll">
        <div v-if="selectedContacts.length > 0" class="forward-modal__selected-list">
          <div v-for="item in selectedContacts" :key="item.id" class="forward-modal__selected-item">
            <Avatar
              :id="item.peerId"
              :type="item.sceneType === SceneType.Group ? 'group' : undefined"
              class="forward-modal__selected-avatar" />
            <span class="forward-modal__selected-name">{{ item.name }}</span>
            <button
              type="button"
              class="forward-modal__selected-remove"
              :aria-label="t('message.forward.removeSelected')"
              @click="removeChat(item.id)">
              <svg class="forward-modal__selected-remove-icon" aria-hidden="true">
                <use href="#close" />
              </svg>
            </button>
          </div>
        </div>
      </n-scrollbar>

      <n-divider class="forward-modal__divider" />

      <div class="forward-modal__preview-wrap">
        <div
          class="forward-modal__preview"
          :class="{ 'forward-modal__preview--text': props.message.msgType === 'text' }">
          <div class="forward-modal__main" :class="{ 'forward-modal__main--text': props.message.msgType === 'text' }">
            <div
              class="forward-modal__bubble"
              :class="{
                'forward-modal__bubble--plain': isPlainBubble(props.message),
                'forward-modal__bubble--text': props.message.msgType === 'text',
                'forward-modal__bubble--file': props.message.msgType === 'file',
                'forward-modal__bubble--cloud-share': props.message.msgType === 'cloud_share',
                'forward-modal__bubble--ecard': props.message.msgType === 'ecard'
              }">
              <MessageItem :message="props.message" :is-self="false" :disable-events="true" />
            </div>
          </div>
        </div>
      </div>

      <div class="forward-modal__actions">
        <n-button
          class="forward-modal__action-btn"
          type="primary"
          :disabled="selectedChatIds.length === 0"
          :loading="sending"
          @click="onSend">
          {{ t('message.forward.send') }}
        </n-button>
        <n-button class="forward-modal__action-btn" @click="onCancel">
          {{ t('message.forward.cancel') }}
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { contactsApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import MessageItem from '@/components/Message/MessageList/Item/index.vue'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useMessageForwardStore } from '@/stores/message/messageForward'
  import type { Contact } from '@/types/api/contacts'
  import type { Message } from '@/types/api/message'
  import { useI18n } from 'vue-i18n'

  type SectionKey = 'friend' | 'group'

  interface SelectedContactItem {
    id: string
    peerId: string
    name: string
    sceneType: SceneType
  }

  const messageForwardStore = useMessageForwardStore()
  const props = defineProps<{
    message: Message
  }>()

  const emit = defineEmits<{
    close: []
  }>()

  useEscapeOverlay(() => {
    emit('close')
  }, true)

  const { t } = useI18n()

  const isPlainBubble = (msg: Message) =>
    msg.msgType === 'image' || msg.msgType === 'video' || msg.msgType === 'sticker'

  const searchKeyword = ref('')
  const selectedChatIds = ref<string[]>([])
  const sending = ref(false)
  const friendList = ref<Contact[]>([])
  const groupList = ref<Contact[]>([])
  const friendListLoading = ref(false)
  const groupListLoading = ref(false)
  const expandedSections = ref<Record<SectionKey, boolean>>({
    friend: true,
    group: false
  })

  const getFriendDisplayName = (contact: Contact) => contact.remark || contact.username

  const getGroupDisplayName = (contact: Contact) => {
    const name = contact.groupName || contact.remark || contact.username
    if (contact.groupMemberNum != null) {
      return `${name} (${contact.groupMemberNum})`
    }
    return name
  }

  const matchKeyword = (name: string) => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return true
    return name.toLowerCase().includes(keyword)
  }

  const filteredFriends = computed(() =>
    friendList.value.filter((contact) => matchKeyword(getFriendDisplayName(contact)))
  )

  const filteredGroups = computed(() => groupList.value.filter((contact) => matchKeyword(getGroupDisplayName(contact))))

  const contactMap = computed(() => {
    const map = new Map<string, Contact>()
    for (const contact of [...groupList.value, ...friendList.value]) {
      map.set(contact.id, contact)
    }
    return map
  })

  const groupIdSet = computed(() => new Set(groupList.value.map((contact) => contact.id)))

  const selectedContacts = computed<SelectedContactItem[]>(() =>
    selectedChatIds.value
      .map((id) => {
        const contact = contactMap.value.get(id)
        if (!contact) return null
        const isGroup = groupIdSet.value.has(id)
        return {
          id: contact.id,
          peerId: contact.peerId,
          name: isGroup ? getGroupDisplayName(contact) : getFriendDisplayName(contact),
          sceneType: isGroup ? SceneType.Group : SceneType.User
        }
      })
      .filter((item): item is SelectedContactItem => item !== null)
  )

  const toggleSection = (key: SectionKey) => {
    expandedSections.value[key] = !expandedSections.value[key]
  }

  const fetchFriendList = () => {
    if (friendListLoading.value) return
    friendListLoading.value = true
    contactsApi.friendList().then((res) => {
      if (res.code === 0 && res.data) {
        friendList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
      friendListLoading.value = false
    })
  }

  const fetchGroupList = () => {
    if (groupListLoading.value) return
    groupListLoading.value = true
    contactsApi.groupList().then((res) => {
      if (res.code === 0 && res.data) {
        groupList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
      groupListLoading.value = false
    })
  }

  const fetchContactLists = () => {
    fetchFriendList()
    fetchGroupList()
  }

  fetchContactLists()

  watch(searchKeyword, (keyword) => {
    if (!keyword.trim()) return
    expandedSections.value.friend = true
    expandedSections.value.group = true
  })

  const isChatSelected = (chatId: string) => selectedChatIds.value.includes(chatId)

  const toggleChat = (chatId: string) => {
    if (isChatSelected(chatId)) {
      selectedChatIds.value = selectedChatIds.value.filter((id) => id !== chatId)
    } else {
      selectedChatIds.value = [...selectedChatIds.value, chatId]
    }
  }

  const removeChat = (chatId: string) => {
    selectedChatIds.value = selectedChatIds.value.filter((id) => id !== chatId)
  }

  const onCancel = () => {
    emit('close')
  }

  const onSend = () => {
    if (selectedContacts.value.length === 0 || sending.value) return

    sending.value = true
    const peers = selectedContacts.value.map((item) => ({
      peerId: item.peerId,
      sceneType: item.sceneType
    }))
    messageForwardStore.forward(peers, props.message)
    sending.value = false
    emit('close')
  }
</script>

<style scoped lang="scss">
  .forward-modal {
    display: flex;
    width: 720px;
    max-width: 92vw;
    height: 520px;
    max-height: 85vh;
    background: var(--bg-secondary-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;

    &__left {
      display: flex;
      flex-direction: column;
      width: 40%;
      min-width: 0;
      padding: 12px 10px;
      border-right: 1px solid var(--divider-color);
      box-sizing: border-box;
    }

    &__search {
      flex-shrink: 0;

      :deep(.n-input-wrapper) {
        background: var(--input-soft-bg);
        border-radius: 4px;
      }

      :deep(.n-input__border),
      :deep(.n-input__state-border) {
        border: none;
      }

      :deep(.n-input__input-el) {
        font-size: 13px;
        color: var(--text-color);

        &::placeholder {
          color: var(--text-secondary-color);
        }
      }
    }

    &__search-icon {
      width: 16px;
      height: 16px;
      color: var(--text-secondary-color);
    }

    &__list-scroll {
      flex: 1;
      min-height: 0;
      margin-top: 16px;

      :deep(.n-scrollbar-rail) {
        right: 0;
      }
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 10px;
      padding-right: 4px;
    }

    &__section {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &__section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 6px 6px;
      border: none;
      border-radius: 4px;
      background: transparent;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted-color);
      cursor: pointer;
      user-select: none;
    }

    &__section-left {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    &__section-arrow {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      color: var(--text-secondary-color);
      transition: transform 0.2s ease;
      transform: rotate(0deg);

      &--expanded {
        transform: rotate(90deg);
      }
    }

    &__section-hint {
      padding: 8px 10px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__chat-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 6px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 70%, transparent);
      }

      &--active {
        background: color-mix(in srgb, var(--card-bg-color) 90%, transparent);
      }
    }

    &__checkbox {
      flex-shrink: 0;
      pointer-events: none;
    }

    &__avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      overflow: hidden;
    }

    &__chat-name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__right {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      padding: 12px 16px 16px;
      box-sizing: border-box;
    }

    &__right-head {
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted-color);
      margin-bottom: 10px;
    }

    &__selected-scroll {
      flex: 1;
      min-height: 0;

      :deep(.n-scrollbar-rail) {
        right: 0;
      }
    }

    &__selected-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-right: 4px;
    }

    &__selected-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 4px;
      border-radius: 4px;
    }

    &__selected-avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      overflow: hidden;
    }

    &__selected-name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__selected-remove {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--text-color);
      }
    }

    &__selected-remove-icon {
      width: 14px;
      height: 14px;
    }

    &__divider {
      flex-shrink: 0;
      margin: 12px 0;

      :deep(.n-divider__line) {
        height: 0.5px;
        background-color: var(--divider-color);
      }
    }

    &__preview-wrap {
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      margin-top: 0;
      margin-bottom: 12px;
      width: 100%;
    }

    &__preview {
      width: fit-content;
      max-width: 100%;
      min-width: 0;

      &--text {
        width: 100%;
      }
    }

    &__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: fit-content;
      max-width: 100%;

      &--text {
        max-width: 100%;
        width: 100%;
      }
    }

    &__bubble {
      position: relative;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 14px;
      background: var(--bg-primary-color);
      color: var(--text-color);
      word-break: break-word;

      &--text {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
      }

      &--file,
      &--cloud-share,
      &--ecard {
        padding: 0;
        background: var(--bg-primary-color);
        color: var(--text-color);
      }

      &--plain {
        padding: 0;
        background: transparent;
        color: var(--text-color);
      }

      :deep(.message-item) {
        max-width: 100% !important;
        width: fit-content !important;
        color: inherit;
      }

      :deep(.message-item--text) {
        width: 100% !important;
        max-width: 100% !important;
      }

      :deep(.message-text) {
        color: var(--text-color);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: pre-line;
        word-break: break-word;
      }

      :deep(.message-file),
      :deep(.message-file__name),
      :deep(.message-ecard__name),
      :deep(.message-voice__duration) {
        color: var(--text-color);
      }

      :deep(.message-file__size),
      :deep(.message-ecard__footer) {
        color: var(--text-secondary-color);
      }

      :deep(.message-file__status) {
        color: var(--text-muted-color);
      }

      :deep(.message-voice__icon) {
        color: var(--text-color);
      }
    }

    &__actions {
      flex-shrink: 0;
      display: flex;
      gap: 10px;
    }

    &__action-btn {
      flex: 1;
      height: 36px;
      border-radius: 4px;
    }
  }
</style>
