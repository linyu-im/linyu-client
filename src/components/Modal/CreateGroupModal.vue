<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center" @after-leave="onAfterLeave">
    <div class="create-group-modal">
      <div class="create-group-modal__left">
        <n-input
          v-model:value="searchKeyword"
          size="small"
          clearable
          class="create-group-modal__search"
          :placeholder="t('message.createGroup.search')">
          <template #prefix>
            <svg class="create-group-modal__search-icon" aria-hidden="true">
              <use href="#search" />
            </svg>
          </template>
        </n-input>

        <div class="create-group-modal__section-title">{{ t('message.createGroup.selectFriends') }}</div>

        <n-scrollbar class="create-group-modal__list-scroll">
          <div class="create-group-modal__list">
            <div v-if="friendListLoading" class="create-group-modal__hint">{{ t('contacts.loading') }}</div>
            <div v-else-if="filteredFriends.length === 0" class="create-group-modal__hint">
              {{ searchKeyword ? t('message.forward.noSearchResult') : t('contacts.emptyFriends') }}
            </div>
            <template v-else>
              <div
                v-for="friend in filteredFriends"
                :key="friend.id"
                role="button"
                tabindex="0"
                class="create-group-modal__friend-item"
                :class="{ 'create-group-modal__friend-item--active': selectedIds.has(friend.id) }"
                @click="toggleFriend(friend.id)"
                @keydown.enter.prevent="toggleFriend(friend.id)"
                @keydown.space.prevent="toggleFriend(friend.id)">
                <n-checkbox class="create-group-modal__checkbox" :checked="selectedIds.has(friend.id)" />
                <Avatar :id="friend.peerId" class="create-group-modal__avatar" />
                <span class="create-group-modal__friend-name">{{ getFriendDisplayName(friend) }}</span>
              </div>
            </template>
          </div>
        </n-scrollbar>
      </div>

      <div class="create-group-modal__right">
        <div class="create-group-modal__right-head">{{ t('message.createGroup.title') }}</div>

        <n-scrollbar class="create-group-modal__selected-scroll">
          <div v-if="selectedFriends.length > 0" class="create-group-modal__selected-list">
            <div v-for="friend in selectedFriends" :key="friend.id" class="create-group-modal__selected-item">
              <Avatar :id="friend.peerId" class="create-group-modal__selected-avatar" />
              <span class="create-group-modal__selected-name">{{ getFriendDisplayName(friend) }}</span>
              <button
                type="button"
                class="create-group-modal__selected-remove"
                :aria-label="t('message.createGroup.removeSelected')"
                @click="toggleFriend(friend.id)">
                <svg class="create-group-modal__selected-remove-icon" aria-hidden="true">
                  <use href="#close" />
                </svg>
              </button>
            </div>
          </div>
        </n-scrollbar>

        <div class="create-group-modal__actions">
          <n-button
            class="create-group-modal__action-btn"
            type="primary"
            :disabled="selectedFriends.length === 0 || creating"
            :loading="creating"
            @click="onConfirm">
            {{ t('message.createGroup.confirm') }}
          </n-button>
          <n-button class="create-group-modal__action-btn" @click="onCancel">
            {{ t('message.createGroup.cancel') }}
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { contactsApi, groupApi } from '@/api'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { SceneType } from '@/constants/common'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import type { Contact } from '@/types/api/contacts'
  import { syncGroupAvatarAfterCreate } from '@/utils/common/groupAvatar'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  const { t } = useI18n()
  const homeTabStore = useHomeTabStore()

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const searchKeyword = ref('')
  const selectedIds = ref<Set<string>>(new Set())
  const friendList = ref<Contact[]>([])
  const friendListLoading = ref(false)
  const creating = ref(false)

  const getFriendDisplayName = (contact: Contact) => contact.remark || contact.username

  const matchKeyword = (name: string) => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return true
    return name.toLowerCase().includes(keyword)
  }

  const filteredFriends = computed(() =>
    friendList.value.filter((contact) => matchKeyword(getFriendDisplayName(contact)))
  )

  const contactMap = computed(() => {
    const map = new Map<string, Contact>()
    for (const contact of friendList.value) {
      map.set(contact.id, contact)
    }
    return map
  })

  const selectedFriends = computed(() =>
    [...selectedIds.value]
      .map((id) => contactMap.value.get(id))
      .filter((contact): contact is Contact => contact !== undefined)
  )

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

  watch(visible, (show) => {
    if (show) {
      fetchFriendList()
    }
  })

  const toggleFriend = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds.value = next
  }

  const onConfirm = () => {
    if (creating.value || selectedFriends.value.length === 0) return
    creating.value = true
    groupApi
      .create({
        groupMemberList: selectedFriends.value.map((contact) => contact.peerId)
      })
      .then((res) => {
        if (res.code === 0 && res.data) {
          const groupId = res.data.id
          return homeTabStore.openMessageWithPeer(groupId, SceneType.Group).then(() => {
            visible.value = false
            void syncGroupAvatarAfterCreate(groupId)
          })
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        creating.value = false
      })
  }

  const resetForm = () => {
    searchKeyword.value = ''
    selectedIds.value = new Set()
    creating.value = false
  }

  const onCancel = () => {
    visible.value = false
  }

  const onAfterLeave = () => {
    resetForm()
  }
</script>

<style scoped lang="scss">
  .create-group-modal {
    display: flex;
    width: 600px;
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

    &__section-title {
      flex-shrink: 0;
      margin-top: 12px;
      padding: 0 4px 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted-color);
    }

    &__list-scroll {
      flex: 1;
      min-height: 0;

      :deep(.n-scrollbar-rail) {
        right: 0;
      }
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-right: 4px;
    }

    &__hint {
      padding: 8px 10px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary-color);
    }

    &__friend-item {
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

    &__friend-name {
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
      color: var(--text-color);
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

    &__actions {
      flex-shrink: 0;
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }

    &__action-btn {
      flex: 1;
      height: 36px;
      border-radius: 4px;
    }
  }
</style>
