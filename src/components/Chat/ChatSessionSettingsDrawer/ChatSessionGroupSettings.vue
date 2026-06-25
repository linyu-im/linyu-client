<template>
  <div class="chat-settings-drawer__inner">
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
          <span class="chat-settings-drawer__member-name">{{ getMemberDisplayName(member) }}</span>
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

    <section class="chat-settings-drawer__card">
      <div class="chat-settings-drawer__section-head">
        <span class="chat-settings-drawer__title">{{ t('message.chatSettings.group.announcement') }}</span>
      </div>
      <p class="chat-settings-drawer__announcement">{{ announcementText }}</p>
      <button type="button" class="chat-settings-drawer__announcement-more" @click="onViewMoreAnnouncement">
        {{ t('message.chatSettings.group.viewMoreAnnouncement') }}
      </button>
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
      <button type="button" class="chat-settings-drawer__action">
        {{ t('message.chatSettings.viewHistory') }}
      </button>
    </section>

    <section class="chat-settings-drawer__card">
      <button type="button" class="chat-settings-drawer__action chat-settings-drawer__action--danger">
        {{ t('message.chatSettings.deleteHistory') }}
      </button>
    </section>

    <button type="button" class="chat-settings-drawer__footer-action" @click="onLeaveGroup">
      {{ t('message.chatSettings.group.leaveGroup') }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { groupApi, robotApi } from '@/api'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import { useChatStore } from '@/stores/chat'
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

  const { t } = useI18n()
  const chatStore = useChatStore()

  const memberKeyword = ref('')
  const membersExpanded = ref(false)
  const members = ref<GroupMember[]>([])
  const robots = ref<Robot[]>([])

  const getMemberDisplayName = (member: GroupMember) => member.groupNickName?.trim() || member.username

  const displayMembers = computed(() => {
    const keyword = memberKeyword.value.trim().toLowerCase()
    if (!keyword) return members.value
    return members.value.filter((item) => getMemberDisplayName(item).toLowerCase().includes(keyword))
  })

  const hasOverflowMembers = computed(() => displayMembers.value.length + 1 > MEMBER_GRID_MAX_SLOTS)

  const shouldCollapseMembers = computed(() => !membersExpanded.value && hasOverflowMembers.value)

  const visibleMembers = computed(() => {
    if (!shouldCollapseMembers.value) return displayMembers.value
    return displayMembers.value.slice(0, MEMBER_GRID_MAX_SLOTS - 1)
  })

  const announcementText = computed(() => {
    const text = props.groupInfo?.info.describe?.trim()
    if (text) return text
    return t('message.chatSettings.group.announcementPlaceholder')
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
    window.$message.info(t('message.chatSettings.addTodo'))
  }

  const onToggleMembersExpanded = () => {
    membersExpanded.value = !membersExpanded.value
  }

  const onAddRobot = () => {
    window.$message.info(t('message.chatSettings.addTodo'))
  }

  const onViewMoreAnnouncement = () => {
    window.$message.info(t('message.chatSettings.addTodo'))
  }

  const onLeaveGroup = () => {
    window.$message.info(t('message.chatSettings.addTodo'))
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

  watch(
    () => [props.show, props.groupInfo?.info.id] as const,
    ([visible, groupId]) => {
      if (!visible) {
        memberKeyword.value = ''
        membersExpanded.value = false
        return
      }
      if (!groupId) {
        members.value = []
        membersExpanded.value = false
        return
      }
      membersExpanded.value = false
      fetchMembers()
      fetchRobots()
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  @use './chatSettingsDrawer.scss';
</style>
