<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center" @after-leave="onAfterLeave">
    <div class="transfer-group-modal">
      <div class="transfer-group-modal__left">
        <n-input
          v-model:value="searchKeyword"
          size="small"
          clearable
          class="transfer-group-modal__search"
          :placeholder="t('message.chatSettings.group.transferGroup.search')">
          <template #prefix>
            <svg class="transfer-group-modal__search-icon" aria-hidden="true">
              <use href="#search" />
            </svg>
          </template>
        </n-input>

        <div class="transfer-group-modal__section-title">
          {{ t('message.chatSettings.group.transferGroup.selectMember') }}
        </div>

        <n-scrollbar class="transfer-group-modal__list-scroll">
          <div class="transfer-group-modal__list">
            <div v-if="memberListLoading" class="transfer-group-modal__hint">{{ t('contacts.loading') }}</div>
            <div v-else-if="filteredMembers.length === 0" class="transfer-group-modal__hint">
              {{ searchKeyword ? t('message.forward.noSearchResult') : t('contacts.emptyFriends') }}
            </div>
            <template v-else>
              <div
                v-for="member in filteredMembers"
                :key="member.id"
                role="button"
                tabindex="0"
                class="transfer-group-modal__member-item"
                :class="{ 'transfer-group-modal__member-item--active': selectedId === member.id }"
                @click="selectMember(member.id)"
                @keydown.enter.prevent="selectMember(member.id)"
                @keydown.space.prevent="selectMember(member.id)">
                <n-radio :checked="selectedId === member.id" />
                <Avatar :id="member.userId" class="transfer-group-modal__avatar" />
                <span class="transfer-group-modal__member-name">{{ getMemberDisplayName(member) }}</span>
              </div>
            </template>
          </div>
        </n-scrollbar>
      </div>

      <div class="transfer-group-modal__right">
        <div class="transfer-group-modal__right-head">
          {{ t('message.chatSettings.group.transferGroup.title') }}
        </div>

        <n-scrollbar class="transfer-group-modal__selected-scroll">
          <div v-if="selectedMember" class="transfer-group-modal__selected-list">
            <div class="transfer-group-modal__selected-item">
              <Avatar :id="selectedMember.userId" class="transfer-group-modal__selected-avatar" />
              <span class="transfer-group-modal__selected-name">{{ getMemberDisplayName(selectedMember) }}</span>
              <button
                type="button"
                class="transfer-group-modal__selected-remove"
                :aria-label="t('message.chatSettings.group.transferGroup.removeSelected')"
                @click="clearSelection">
                <svg class="transfer-group-modal__selected-remove-icon" aria-hidden="true">
                  <use href="#close" />
                </svg>
              </button>
            </div>
          </div>
        </n-scrollbar>

        <div class="transfer-group-modal__actions">
          <n-button
            class="transfer-group-modal__action-btn"
            type="primary"
            :disabled="!selectedMember"
            @click="onConfirm">
            {{ t('message.chatSettings.group.transferGroup.confirm') }}
          </n-button>
          <n-button class="transfer-group-modal__action-btn" @click="onCancel">
            {{ t('message.chatSettings.group.transferGroup.cancel') }}
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { groupApi } from '@/api'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useChatStore } from '@/stores/chat/chat'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import { useUserStore } from '@/stores/user/user'
  import type { GroupMember } from '@/types/api/groupMember'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    groupId: string
  }>()

  const emit = defineEmits<(e: 'success') => void>()

  const visible = defineModel<boolean>('show', { default: false })

  const { t } = useI18n()
  const userStore = useUserStore()
  const peerInfoStore = usePeerInfoStore()
  const chatStore = useChatStore()

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const searchKeyword = ref('')
  const selectedId = ref<string | null>(null)
  const memberList = ref<GroupMember[]>([])
  const memberListLoading = ref(false)

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')

  const getMemberDisplayName = (member: GroupMember) => member.groupNickName?.trim() || member.username

  const matchKeyword = (name: string) => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return true
    return name.toLowerCase().includes(keyword)
  }

  const filteredMembers = computed(() =>
    memberList.value.filter((member) => matchKeyword(getMemberDisplayName(member)))
  )

  const memberMap = computed(() => {
    const map = new Map<string, GroupMember>()
    for (const member of memberList.value) {
      map.set(member.id, member)
    }
    return map
  })

  const selectedMember = computed(() => (selectedId.value ? (memberMap.value.get(selectedId.value) ?? null) : null))

  const fetchMemberList = () => {
    if (memberListLoading.value) return
    memberListLoading.value = true
    groupApi.listMembers({ groupId: props.groupId }).then((res) => {
      if (res.code === 0 && res.data) {
        memberList.value = res.data.filter((m) => m.userId !== currentUserId.value)
      } else {
        window.$message.error(res.msg)
      }
      memberListLoading.value = false
    })
  }

  watch(visible, (show) => {
    if (show) {
      fetchMemberList()
    }
  })

  const selectMember = (id: string) => {
    selectedId.value = selectedId.value === id ? null : id
  }

  const clearSelection = () => {
    selectedId.value = null
  }

  const onConfirm = () => {
    if (!selectedMember.value) return
    groupApi.transferOwner({ groupId: props.groupId, newOwnerId: selectedMember.value.userId }).then((res) => {
      if (res.code === 0) {
        peerInfoStore.refreshGroup(props.groupId)
        chatStore.refreshList()
        visible.value = false
        emit('success')
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const resetForm = () => {
    searchKeyword.value = ''
    selectedId.value = null
  }

  const onCancel = () => {
    visible.value = false
  }

  const onAfterLeave = () => {
    resetForm()
  }
</script>

<style scoped lang="scss">
  .transfer-group-modal {
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

    &__member-item {
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

    &__avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      overflow: hidden;
    }

    &__member-name {
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
