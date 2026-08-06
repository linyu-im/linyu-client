<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center" @after-leave="onAfterLeave">
    <div class="select-group-call-members">
      <div class="select-group-call-members__left">
        <n-input
          v-model:value="searchKeyword"
          size="small"
          clearable
          class="select-group-call-members__search"
          :placeholder="t('callInvite.selectMembers.search')">
          <template #prefix>
            <svg class="select-group-call-members__search-icon" aria-hidden="true">
              <use href="#search" />
            </svg>
          </template>
        </n-input>

        <div class="select-group-call-members__section-title">
          {{ t('callInvite.selectMembers.selectMembers') }}
        </div>

        <n-scrollbar class="select-group-call-members__list-scroll">
          <div class="select-group-call-members__list">
            <div v-if="loading" class="select-group-call-members__hint">{{ t('contacts.loading') }}</div>
            <div v-else-if="filteredMembers.length === 0" class="select-group-call-members__hint">
              {{ searchKeyword ? t('message.forward.noSearchResult') : t('callInvite.selectMembers.empty') }}
            </div>
            <template v-else>
              <div
                v-for="member in filteredMembers"
                :key="member.userId"
                role="button"
                tabindex="0"
                class="select-group-call-members__item"
                :class="{ 'select-group-call-members__item--active': selectedIds.has(member.userId) }"
                @click="toggleMember(member.userId)"
                @keydown.enter.prevent="toggleMember(member.userId)"
                @keydown.space.prevent="toggleMember(member.userId)">
                <n-checkbox class="select-group-call-members__checkbox" :checked="selectedIds.has(member.userId)" />
                <Avatar :id="member.userId" class="select-group-call-members__avatar" />
                <span class="select-group-call-members__name">{{ getMemberDisplayName(member) }}</span>
              </div>
            </template>
          </div>
        </n-scrollbar>
      </div>

      <div class="select-group-call-members__right">
        <div class="select-group-call-members__right-head">{{ t('callInvite.selectMembers.title') }}</div>

        <n-scrollbar class="select-group-call-members__selected-scroll">
          <div v-if="selectedMembers.length > 0" class="select-group-call-members__selected-list">
            <div
              v-for="member in selectedMembers"
              :key="member.userId"
              class="select-group-call-members__selected-item">
              <Avatar :id="member.userId" class="select-group-call-members__selected-avatar" />
              <span class="select-group-call-members__selected-name">{{ getMemberDisplayName(member) }}</span>
              <button
                type="button"
                class="select-group-call-members__selected-remove"
                :aria-label="t('callInvite.selectMembers.removeSelected')"
                @click="toggleMember(member.userId)">
                <svg class="select-group-call-members__selected-remove-icon" aria-hidden="true">
                  <use href="#close" />
                </svg>
              </button>
            </div>
          </div>
        </n-scrollbar>

        <div class="select-group-call-members__actions">
          <n-button
            class="select-group-call-members__action-btn"
            type="primary"
            :disabled="selectedMembers.length === 0"
            @click="onConfirm">
            {{ t('callInvite.selectMembers.confirm') }}
          </n-button>
          <n-button class="select-group-call-members__action-btn" @click="onCancel">
            {{ t('callInvite.selectMembers.cancel') }}
          </n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { groupApi } from '@/api'
  import Avatar from '@/components/Avatar.vue'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useUserStore } from '@/stores/user/user'
  import type { GroupMember } from '@/types/api/groupMember'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    groupId: string
  }>()

  const emit = defineEmits<(e: 'confirm', userIds: string[]) => void>()

  const visible = defineModel<boolean>('show', { default: false })
  const { t } = useI18n()
  const userStore = useUserStore()

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const searchKeyword = ref('')
  const selectedIds = ref<Set<string>>(new Set())
  const members = ref<GroupMember[]>([])
  const loading = ref(false)

  const getMemberDisplayName = (member: GroupMember) =>
    member.groupNickName?.trim() || member.username?.trim() || member.userId

  const matchKeyword = (name: string) => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    if (!keyword) return true
    return name.toLowerCase().includes(keyword)
  }

  const filteredMembers = computed(() => members.value.filter((member) => matchKeyword(getMemberDisplayName(member))))

  const memberMap = computed(() => {
    const map = new Map<string, GroupMember>()
    for (const member of members.value) {
      map.set(member.userId, member)
    }
    return map
  })

  const selectedMembers = computed(() =>
    [...selectedIds.value]
      .map((id) => memberMap.value.get(id))
      .filter((member): member is GroupMember => member !== undefined)
  )

  const fetchMembers = () => {
    if (loading.value || !props.groupId) return
    loading.value = true
    groupApi.listMembers({ groupId: props.groupId }).then((res) => {
      if (res.code === 0 && res.data) {
        const selfId = userStore.authInfo.userId
        members.value = res.data.filter((item) => item.userId !== selfId)
      } else {
        window.$message.error(res.msg)
      }
      loading.value = false
    })
  }

  watch(visible, (show) => {
    if (show) fetchMembers()
  })

  const toggleMember = (userId: string) => {
    const next = new Set(selectedIds.value)
    if (next.has(userId)) next.delete(userId)
    else next.add(userId)
    selectedIds.value = next
  }

  const onConfirm = () => {
    if (selectedMembers.value.length === 0) return
    emit(
      'confirm',
      selectedMembers.value.map((item) => item.userId)
    )
    visible.value = false
  }

  const resetForm = () => {
    searchKeyword.value = ''
    selectedIds.value = new Set()
    members.value = []
  }

  const onCancel = () => {
    visible.value = false
  }

  const onAfterLeave = () => {
    resetForm()
  }
</script>

<style scoped lang="scss">
  .select-group-call-members {
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
          color: var(--text-muted-color);
        }
      }
    }

    &__search-icon {
      width: 16px;
      height: 16px;
      color: var(--text-muted-color);
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
      color: var(--text-muted-color);
    }

    &__item {
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

    &__name {
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
      padding: 12px 14px;
      box-sizing: border-box;
    }

    &__right-head {
      flex-shrink: 0;
      margin-bottom: 10px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__selected-scroll {
      flex: 1;
      min-height: 0;
    }

    &__selected-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__selected-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 4px;
    }

    &__selected-avatar {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      overflow: hidden;
    }

    &__selected-name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__selected-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;

      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
    }

    &__selected-remove-icon {
      width: 12px;
      height: 12px;
    }

    &__actions {
      flex-shrink: 0;
      display: flex;
      flex-direction: row;
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
