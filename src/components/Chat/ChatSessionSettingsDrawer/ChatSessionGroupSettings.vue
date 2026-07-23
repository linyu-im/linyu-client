<template>
  <div class="chat-settings-drawer__inner">
    <section v-if="groupInfo" class="chat-settings-drawer__card chat-settings-drawer__user">
      <button
        type="button"
        class="chat-settings-drawer__user-main"
        :class="{ 'chat-settings-drawer__user-main--readonly': !isGroupOwner }"
        @click="onOpenProfileSettings">
        <Avatar
          :id="groupInfo.info.id"
          type="group"
          :size="36"
          class="chat-settings-drawer__user-avatar"
          :profile-enabled="false" />
        <div class="chat-settings-drawer__user-info">
          <div class="chat-settings-drawer__user-name">{{ groupInfo.info.name }}</div>
          <span v-if="groupInfo.info.groupNumber" class="chat-settings-drawer__user-id">
            {{ groupInfo.info.groupNumber }}
          </span>
        </div>
      </button>
    </section>

    <section class="chat-settings-drawer__card">
      <div class="chat-settings-drawer__search">
        <n-input
          v-model:value="memberKeyword"
          size="small"
          :placeholder="t('message.chatSettings.group.searchMembers')"
          clearable>
          <template #prefix>
            <svg class="size-14px text-[var(--text-secondary-color)]">
              <use href="#search" />
            </svg>
          </template>
        </n-input>
      </div>

      <div class="chat-settings-drawer__member-grid">
        <button
          v-for="member in visibleMembers"
          :key="member.id"
          type="button"
          class="chat-settings-drawer__member-item">
          <Avatar
            class="chat-settings-drawer__member-avatar"
            :id="member.userId"
            :size="36"
            round
            :profile-enabled="true" />
          <Name class="chat-settings-drawer__member-name" :id="member.userId" :group-id="groupInfo?.info.id" instant />
        </button>
        <button
          type="button"
          class="chat-settings-drawer__member-item chat-settings-drawer__member-add"
          @click="onAddMember">
          <span class="chat-settings-drawer__robot-add-icon" aria-hidden="true">
            <svg class="size-14px">
              <use href="#plus" />
            </svg>
          </span>
          <span class="chat-settings-drawer__member-name">{{ t('message.chatSettings.add') }}</span>
        </button>
        <button
          v-if="isGroupAdmin"
          type="button"
          class="chat-settings-drawer__member-item chat-settings-drawer__member-remove"
          @click="onRemoveMember">
          <span class="chat-settings-drawer__robot-add-icon" aria-hidden="true">
            <svg class="size-14px">
              <use href="#subtract" />
            </svg>
          </span>
          <span class="chat-settings-drawer__member-name">{{ t('message.chatSettings.remove') }}</span>
        </button>
      </div>

      <button
        v-if="hasOverflowMembers"
        type="button"
        class="chat-settings-drawer__view-more"
        @click="onToggleMembersExpanded">
        <span>
          {{
            membersExpanded
              ? t('message.chatSettings.group.collapseMembers')
              : t('message.chatSettings.group.viewMoreMembers')
          }}
        </span>
        <svg
          class="chat-settings-drawer__view-more-icon"
          :class="{ 'chat-settings-drawer__view-more-icon--expanded': membersExpanded }"
          aria-hidden="true">
          <use href="#right-arrow" />
        </svg>
      </button>
    </section>

    <section class="chat-settings-drawer__card">
      <div class="chat-settings-drawer__section-head">
        <span class="chat-settings-drawer__title">{{ t('message.chatSettings.exclusiveRobot') }}</span>
        <span class="chat-settings-drawer__subtitle">{{ t('message.chatSettings.exclusiveRobotDesc') }}</span>
      </div>
      <div class="chat-settings-drawer__robot-list">
        <div v-for="robot in robots" :key="robot.id" class="chat-settings-drawer__robot-item">
          <Avatar class="chat-settings-drawer__robot-avatar" :id="robot.id" type="robot" :size="36" round />
          <span class="chat-settings-drawer__robot-name">{{ robot.robotName }}</span>
        </div>
        <button
          type="button"
          class="chat-settings-drawer__robot-item chat-settings-drawer__robot-add"
          @click="onAddRobot">
          <span class="chat-settings-drawer__robot-add-icon" aria-hidden="true">
            <svg class="size-14px">
              <use href="#plus" />
            </svg>
          </span>
          <span class="chat-settings-drawer__robot-name">{{ t('message.chatSettings.add') }}</span>
        </button>
      </div>
    </section>

    <section
      class="chat-settings-drawer__card chat-settings-drawer__announcement-card"
      role="button"
      tabindex="0"
      @click="onViewMoreAnnouncement"
      @keydown.enter.prevent="onViewMoreAnnouncement"
      @keydown.space.prevent="onViewMoreAnnouncement">
      <div class="chat-settings-drawer__section-head">
        <span class="chat-settings-drawer__title">{{ t('message.chatSettings.group.announcement') }}</span>
      </div>
      <p class="chat-settings-drawer__announcement">{{ announcementText }}</p>
      <span class="chat-settings-drawer__announcement-more">
        {{ t('message.chatSettings.group.viewMoreAnnouncement') }}
      </span>
    </section>

    <SettingCard>
      <SettingRow :label="t('message.chatSettings.pinChat')">
        <n-switch v-model:value="pinChat" size="small" :disabled="!currentChat" />
      </SettingRow>
      <SettingRow :label="t('message.chatSettings.mute')" :border="false">
        <n-switch v-model:value="muteChat" size="small" :disabled="!currentChat" />
      </SettingRow>
    </SettingCard>

    <section class="chat-settings-drawer__card">
      <button type="button" class="chat-settings-drawer__action" @click="onViewHistory">
        {{ t('message.chatSettings.viewHistory') }}
      </button>
    </section>

    <section v-if="isGroupOwner" class="chat-settings-drawer__card">
      <button type="button" class="chat-settings-drawer__action" @click="onTransferGroup">
        {{ t('message.chatSettings.group.transferGroup.title') }}
      </button>
    </section>

    <section v-if="isGroupOwner" class="chat-settings-drawer__card">
      <button type="button" class="chat-settings-drawer__action" @click="onSetGroupAdmin">
        {{ t('message.chatSettings.group.setGroupAdmin') }}
      </button>
    </section>

    <section class="chat-settings-drawer__card">
      <button
        type="button"
        class="chat-settings-drawer__action chat-settings-drawer__action--danger"
        @click="onDeleteHistory">
        {{ t('message.chatSettings.deleteHistory') }}
      </button>
    </section>

    <button type="button" class="chat-settings-drawer__footer-action" @click="onLeaveGroup">
      {{ isGroupOwner ? t('message.chatSettings.group.dissolveGroup') : t('message.chatSettings.group.leaveGroup') }}
    </button>
  </div>

  <EditGroupProfileModal v-if="groupInfo" v-model:show="showProfileSettings" :group-info="groupInfo" />

  <AddGroupMemberModal v-model:show="showAddMember" :group-id="groupInfo?.info.id ?? ''" @success="fetchMembers" />
  <RemoveGroupMemberModal
    v-model:show="showRemoveMember"
    :group-id="groupInfo?.info.id ?? ''"
    @success="fetchMembers" />
  <SetGroupAdminModal v-model:show="showSetGroupAdmin" :group-id="groupInfo?.info.id ?? ''" @success="fetchMembers" />
  <TransferGroupModal
    v-model:show="showTransferGroup"
    :group-id="groupInfo?.info.id ?? ''"
    @success="onTransferSuccess" />
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { groupApi, robotApi } from '@/api'
  import AddGroupMemberModal from '@/components/Modal/group/AddGroupMemberModal.vue'
  import EditGroupProfileModal from '@/components/Modal/group/EditGroupProfileModal.vue'
  import RemoveGroupMemberModal from '@/components/Modal/group/RemoveGroupMemberModal.vue'
  import SetGroupAdminModal from '@/components/Modal/group/SetGroupAdminModal.vue'
  import TransferGroupModal from '@/components/Modal/group/TransferGroupModal.vue'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import { useChatStore } from '@/stores/chat/chat'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useContactsStore } from '@/stores/user/contacts'
  import { useUserStore } from '@/stores/user/user'
  import { openChatRecord } from '@/utils/message/chatRecord'
  import { openGroupNotice } from '@/utils/desktop/groupNotice'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { GroupMember } from '@/types/api/groupMember'
  import type { Robot } from '@/types/api/robot'

  const MEMBER_GRID_COLUMNS = 5
  const MEMBER_GRID_MAX_ROWS = 2
  const MEMBER_GRID_MAX_SLOTS = MEMBER_GRID_COLUMNS * MEMBER_GRID_MAX_ROWS

  const props = defineProps<{
    groupInfo: GroupInfoResult | null
    chatId: string
    show: boolean
  }>()

  const emit = defineEmits<{
    'history-deleted': []
    'group-dissolved': []
  }>()

  const { t } = useI18n()
  const dialog = useDialog()
  const chatStore = useChatStore()
  const messageDbStore = useMessageDbStore()
  const contactsStore = useContactsStore()
  const userStore = useUserStore()

  const memberKeyword = ref('')
  const membersExpanded = ref(false)
  const showProfileSettings = ref(false)
  const showAddMember = ref(false)
  const showRemoveMember = ref(false)
  const showSetGroupAdmin = ref(false)
  const showTransferGroup = ref(false)
  const isGroupAdmin = ref(false)
  const members = ref<GroupMember[]>([])
  const robots = ref<Robot[]>([])

  const getMemberDisplayName = (member: GroupMember) => member.groupNickName?.trim() || member.username

  const displayMembers = computed(() => {
    const keyword = memberKeyword.value.trim().toLowerCase()
    if (!keyword) return members.value
    return members.value.filter((item) => getMemberDisplayName(item).toLowerCase().includes(keyword))
  })

  const actionButtonCount = computed(() => (isGroupAdmin.value ? 2 : 1))

  const hasOverflowMembers = computed(
    () => displayMembers.value.length + actionButtonCount.value > MEMBER_GRID_MAX_SLOTS
  )

  const shouldCollapseMembers = computed(() => !membersExpanded.value && hasOverflowMembers.value)

  const visibleMembers = computed(() => {
    if (!shouldCollapseMembers.value) return displayMembers.value
    return displayMembers.value.slice(0, MEMBER_GRID_MAX_SLOTS - actionButtonCount.value)
  })

  const announcementText = computed(() => {
    const text = props.groupInfo?.info.groupNoticeContent?.trim()
    if (text) return text
    return t('message.chatSettings.group.announcementPlaceholder')
  })

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')

  const isGroupOwner = computed(() => {
    const ownerUserId = props.groupInfo?.info.ownerUserId
    return !!ownerUserId && ownerUserId === currentUserId.value
  })

  const currentChat = computed(() => {
    if (!props.chatId) return null
    return chatStore.chatList.find((item) => item.id === props.chatId) ?? null
  })

  const pinChat = computed({
    get: () => !!currentChat.value?.peerIsTop,
    set: (value: boolean) => {
      if (!props.chatId || !currentChat.value) return
      if (value === !!currentChat.value.peerIsTop) return
      chatStore.toggleTop(props.chatId, value)
    }
  })

  const muteChat = computed({
    get: () => !!currentChat.value?.peerIsMute,
    set: (value: boolean) => {
      if (!props.chatId || !currentChat.value) return
      if (value === !!currentChat.value.peerIsMute) return
      chatStore.toggleMute(props.chatId, value)
    }
  })

  const onAddMember = () => {
    showAddMember.value = true
  }

  const onRemoveMember = () => {
    showRemoveMember.value = true
  }

  const onOpenProfileSettings = () => {
    if (!isGroupOwner.value) return
    showProfileSettings.value = true
  }

  const onToggleMembersExpanded = () => {
    membersExpanded.value = !membersExpanded.value
  }

  const onAddRobot = () => {
    window.$message.info(t('message.chatSettings.addTodo'))
  }

  const onViewHistory = () => {
    if (!currentChat.value) return
    openChatRecord(currentChat.value)
  }

  const onDeleteHistory = () => {
    const chat = currentChat.value
    if (!chat?.sessionId) return

    dialog.warning({
      title: t('message.chatSettings.deleteHistoryConfirmTitle'),
      content: t('message.chatSettings.deleteHistoryConfirmContent'),
      positiveText: t('message.chatSettings.deleteHistoryConfirm'),
      negativeText: t('message.chatSettings.deleteHistoryCancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        messageDbStore.deleteChatHistoryBySession(chat.sessionId).then(() => {
          emit('history-deleted')
        })
      }
    })
  }

  const onTransferGroup = () => {
    showTransferGroup.value = true
  }

  const onTransferSuccess = () => {
    fetchMembers()
    fetchIsAdmin()
  }

  const onSetGroupAdmin = () => {
    showSetGroupAdmin.value = true
  }

  const onViewMoreAnnouncement = () => {
    const groupId = props.groupInfo?.info.id
    if (!groupId) return
    openGroupNotice(groupId, props.groupInfo?.info.name || '')
  }

  const onLeaveGroup = () => {
    if (isGroupOwner.value) {
      onDissolveGroup()
      return
    }
    const groupId = props.groupInfo?.info.id
    if (!groupId) return

    dialog.warning({
      title: t('message.chatSettings.group.leaveGroupConfirmTitle'),
      content: t('message.chatSettings.group.leaveGroupConfirmContent'),
      positiveText: t('message.chatSettings.group.leaveGroupConfirm'),
      negativeText: t('message.chatSettings.group.leaveGroupCancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        return groupApi.leave({ groupId }).then((res) => {
          if (res.code === 0) {
            const sessionId = currentChat.value?.sessionId
            if (sessionId) {
              messageDbStore.deleteChatHistoryBySession(sessionId)
            }
            chatStore.removeChatLocal(props.chatId)
            contactsStore.removeGroupLocal(groupId)
            contactsStore.fetchGroupList()
            chatStore.refreshList()
            emit('group-dissolved')
            return
          }
          window.$message.error(res.msg)
          return false
        })
      }
    })
  }

  const onDissolveGroup = () => {
    const groupId = props.groupInfo?.info.id
    if (!groupId) return

    dialog.warning({
      title: t('message.chatSettings.group.dissolveGroupConfirmTitle'),
      content: t('message.chatSettings.group.dissolveGroupConfirmContent'),
      positiveText: t('message.chatSettings.group.dissolveGroupConfirm'),
      negativeText: t('message.chatSettings.group.dissolveGroupCancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        return groupApi.dissolve({ groupId }).then((res) => {
          if (res.code === 0) {
            const sessionId = currentChat.value?.sessionId
            if (sessionId) {
              messageDbStore.deleteChatHistoryBySession(sessionId)
            }
            chatStore.removeChatLocal(props.chatId)
            contactsStore.removeGroupLocal(groupId)
            contactsStore.fetchGroupList()
            chatStore.refreshList()
            emit('group-dissolved')
            return
          }
          window.$message.error(res.msg)
          return false
        })
      }
    })
  }

  const fetchMembers = () => {
    const groupId = props.groupInfo?.info.id
    if (!groupId) {
      members.value = []
      return
    }

    groupApi.listMembers({ groupId }).then((res) => {
      if (res.code === 0 && res.data) {
        members.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const fetchRobots = () => {
    robotApi.listRobots().then((res) => {
      if (res.code === 0 && res.data) {
        robots.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const fetchIsAdmin = () => {
    const groupId = props.groupInfo?.info.id
    if (!groupId) {
      isGroupAdmin.value = false
      return
    }
    groupApi.isAdmin({ groupId }).then((res) => {
      if (res.code === 0 && res.data !== undefined) {
        isGroupAdmin.value = res.data
      } else {
        isGroupAdmin.value = false
      }
    })
  }

  watch(
    () => [props.show, props.groupInfo?.info.id] as const,
    ([visible, groupId]) => {
      if (!visible) {
        memberKeyword.value = ''
        membersExpanded.value = false
        showProfileSettings.value = false
        showAddMember.value = false
        showRemoveMember.value = false
        showSetGroupAdmin.value = false
        showTransferGroup.value = false
        isGroupAdmin.value = false
        return
      }
      if (!groupId) {
        members.value = []
        membersExpanded.value = false
        showProfileSettings.value = false
        showAddMember.value = false
        showRemoveMember.value = false
        showSetGroupAdmin.value = false
        showTransferGroup.value = false
        isGroupAdmin.value = false
        return
      }
      membersExpanded.value = false
      showProfileSettings.value = false
      showAddMember.value = false
      showRemoveMember.value = false
      showSetGroupAdmin.value = false
      showTransferGroup.value = false
      fetchMembers()
      fetchRobots()
      fetchIsAdmin()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .chat-settings-drawer {
    &__inner {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 10px 18px;
      box-sizing: border-box;
      user-select: none;

      button:focus,
      button:focus-visible {
        outline: none;
      }

      :deep(.n-switch:focus .n-switch__rail),
      :deep(.n-switch:focus-visible .n-switch__rail) {
        box-shadow: none;
      }

      :deep(.setting-card) {
        padding: 2px 0;
        border-radius: 8px;
        background-color: var(--bg-primary-color);
        border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
      }

      html[data-theme='dark'] & {
        :deep(.setting-card) {
          background-color: color-mix(in srgb, var(--card-bg-color) 28%, var(--bg-secondary-color));
          border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
        }
      }

      :deep(.setting-row) {
        gap: 10px;
        padding: 9px 12px;
        min-height: 40px;
      }

      :deep(.setting-row__label) {
        font-size: 14px;
        line-height: 1.4;
      }
    }

    &__card {
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);

      html[data-theme='dark'] & {
        background: color-mix(in srgb, var(--card-bg-color) 28%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
      }
    }

    &__user {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__user-main {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
      padding: 0;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;

      &--readonly {
        cursor: default;
      }
    }

    &__user-avatar {
      flex-shrink: 0;
    }

    &__user-info {
      min-width: 0;
      flex: 1;
      user-select: none;
    }

    &__user-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__user-id {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      line-height: 1.35;
      color: var(--text-secondary-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__search {
      margin-bottom: 12px;

      :deep(.n-input) {
        height: 28px;
        font-size: 12px;
      }

      :deep(.n-input-wrapper) {
        min-height: 28px;
        background: color-mix(in srgb, var(--card-bg-color) 55%, var(--bg-primary-color));
      }
    }

    &__member-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px 6px;
    }

    &__member-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 0;
      border: none;
      padding: 0;
      background: transparent;
      cursor: pointer;
    }

    &__member-avatar {
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
    }

    &__member-name {
      display: inline-flex;
      justify-content: center;
      width: 100%;
      max-width: 100%;
      font-size: 10px;
      color: var(--text-muted-color);
      text-align: center;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      :deep(.name__text) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &__member-add {
      cursor: pointer;

      &:hover .chat-settings-drawer__robot-add-icon {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }

    &__member-remove {
      cursor: pointer;

      &:hover .chat-settings-drawer__robot-add-icon {
        border-color: var(--red);
        color: var(--red);
      }
    }

    &__view-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      width: 100%;
      margin-top: 12px;
      padding: 4px 0 0;
      border: none;
      background: transparent;
      font-size: 12px;
      color: var(--text-secondary-color);
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__view-more-icon {
      width: 12px;
      height: 12px;
      transform: rotate(90deg);
      transition: transform 0.2s ease;

      &--expanded {
        transform: rotate(-90deg);
      }
    }

    &__section-head {
      display: flex;
      align-items: baseline;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    &__title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__subtitle {
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.4;
    }

    &__robot-list {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex-wrap: wrap;
    }

    &__robot-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 40px;
      border: none;
      padding: 0;
      background: transparent;
    }

    &__robot-avatar {
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
    }

    &__robot-name {
      width: 100%;
      font-size: 10px;
      color: var(--text-muted-color);
      text-align: center;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__robot-add {
      cursor: pointer;

      &:hover .chat-settings-drawer__robot-add-icon {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }

    &__robot-add-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px dashed color-mix(in srgb, var(--border-color) 85%, transparent);
      color: var(--text-secondary-color);
      box-sizing: border-box;
      transition:
        border-color 0.2s ease,
        color 0.2s ease;
    }

    &__announcement {
      display: -webkit-box;
      overflow: hidden;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-secondary-color);
      word-break: break-word;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    &__announcement-card {
      cursor: pointer;
      transition: border-color 0.2s ease;

      &:hover {
        border-color: color-mix(in srgb, var(--primary-color) 35%, var(--border-color));
      }
    }

    &__announcement-more {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
      color: var(--primary-color);
    }

    &__action {
      display: block;
      width: 100%;
      padding: 1px 0;
      border: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.45;
      color: var(--text-color);
      text-align: left;
      cursor: pointer;

      &:hover {
        color: var(--primary-color);
      }

      &--danger {
        color: var(--red);

        &:hover {
          color: color-mix(in srgb, var(--red) 85%, var(--text-color));
        }
      }
    }

    &__footer-action {
      display: block;
      width: 100%;
      padding: 6px 0;
      border: none;
      background: transparent;
      font-size: 14px;
      line-height: 1.45;
      color: var(--red);
      text-align: center;
      cursor: pointer;

      &:hover {
        color: color-mix(in srgb, var(--red) 85%, var(--text-color));
      }
    }
  }
</style>
