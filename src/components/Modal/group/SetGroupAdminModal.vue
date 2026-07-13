<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center" @after-leave="onAfterLeave">
    <div class="set-group-admin-modal">
      <div class="set-group-admin-modal__left">
        <n-input
          v-model:value="searchKeyword"
          size="small"
          clearable
          class="set-group-admin-modal__search"
          :placeholder="t('message.chatSettings.group.setAdmin.search')">
          <template #prefix>
            <svg class="set-group-admin-modal__search-icon" aria-hidden="true">
              <use href="#search" />
            </svg>
          </template>
        </n-input>

        <div class="set-group-admin-modal__section-title">
          {{ t('message.chatSettings.group.setAdmin.currentMembers') }}
        </div>

        <n-scrollbar class="set-group-admin-modal__list-scroll">
          <div class="set-group-admin-modal__list">
            <div v-if="memberListLoading" class="set-group-admin-modal__hint">{{ t('contacts.loading') }}</div>
            <div v-else-if="filteredMembers.length === 0" class="set-group-admin-modal__hint">
              {{ searchKeyword ? t('message.forward.noSearchResult') : t('contacts.emptyFriends') }}
            </div>
            <template v-else>
              <div
                v-for="member in filteredMembers"
                :key="member.id"
                role="button"
                tabindex="0"
                class="set-group-admin-modal__member-item"
                :class="{ 'set-group-admin-modal__member-item--active': selectedIds.has(member.id) }"
                @click="toggleMember(member.id)"
                @keydown.enter.prevent="toggleMember(member.id)"
                @keydown.space.prevent="toggleMember(member.id)">
                <n-checkbox class="set-group-admin-modal__checkbox" :checked="selectedIds.has(member.id)" />
                <Avatar :id="member.userId" class="set-group-admin-modal__avatar" />
                <span class="set-group-admin-modal__member-name">{{ getMemberDisplayName(member) }}</span>
              </div>
            </template>
          </div>
        </n-scrollbar>
      </div>

      <div class="set-group-admin-modal__right">
        <div class="set-group-admin-modal__right-head">
          {{ t('message.chatSettings.group.setAdmin.adminList') }}
        </div>

        <n-scrollbar class="set-group-admin-modal__selected-scroll">
          <div v-if="selectedMembers.length > 0" class="set-group-admin-modal__selected-list">
            <div v-for="member in selectedMembers" :key="member.id" class="set-group-admin-modal__selected-item">
              <Avatar :id="member.userId" class="set-group-admin-modal__selected-avatar" />
              <span class="set-group-admin-modal__selected-name">{{ getMemberDisplayName(member) }}</span>
              <button
                type="button"
                class="set-group-admin-modal__selected-remove"
                :aria-label="t('message.chatSettings.group.setAdmin.removeSelected')"
                @click="toggleMember(member.id)">
                <svg class="set-group-admin-modal__selected-remove-icon" aria-hidden="true">
                  <use href="#close" />
                </svg>
              </button>
            </div>
          </div>
        </n-scrollbar>

        <div class="set-group-admin-modal__actions">
          <n-button class="set-group-admin-modal__action-btn" type="primary" @click="onConfirm">
            {{ t('message.chatSettings.group.setAdmin.confirm') }}
          </n-button>
          <n-button class="set-group-admin-modal__action-btn" @click="onCancel">
            {{ t('message.chatSettings.group.setAdmin.cancel') }}
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { groupApi } from '@/api'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
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

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const searchKeyword = ref('')
  const selectedIds = ref<Set<string>>(new Set())
  const memberList = ref<GroupMember[]>([])
  const memberListLoading = ref(false)
  const initialAdminIds = ref<Set<string>>(new Set())

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

  const selectedMembers = computed(() =>
    [...selectedIds.value]
      .map((id) => memberMap.value.get(id))
      .filter((member): member is GroupMember => member !== undefined)
  )

  const fetchMemberList = () => {
    if (memberListLoading.value) return
    memberListLoading.value = true
    groupApi.listMembers({ groupId: props.groupId }).then((res) => {
      if (res.code === 0 && res.data) {
        const filtered = res.data.filter((m) => m.userId !== currentUserId.value)
        memberList.value = filtered
        const adminIds = new Set(filtered.filter((m) => m.memberRole === 'admin').map((m) => m.id))
        initialAdminIds.value = new Set(adminIds)
        selectedIds.value = new Set(adminIds)
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

  const toggleMember = (id: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedIds.value = next
  }

  const onConfirm = () => {
    const addAdminList: string[] = []
    const removeAdminList: string[] = []
    for (const member of selectedMembers.value) {
      if (!initialAdminIds.value.has(member.id)) {
        addAdminList.push(member.userId)
      }
    }
    for (const id of initialAdminIds.value) {
      if (!selectedIds.value.has(id)) {
        const member = memberMap.value.get(id)
        if (member) removeAdminList.push(member.userId)
      }
    }
    if (addAdminList.length === 0 && removeAdminList.length === 0) visible.value = false
    groupApi.setAdmin({ groupId: props.groupId, addAdminList, removeAdminList }).then((res) => {
      if (res.code === 0) {
        visible.value = false
        emit('success')
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const resetForm = () => {
    searchKeyword.value = ''
    selectedIds.value = new Set()
    initialAdminIds.value = new Set()
  }

  const onCancel = () => {
    visible.value = false
  }

  const onAfterLeave = () => {
    resetForm()
  }
</script>

<style scoped lang="scss">
  .set-group-admin-modal {
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
