<template>
  <div class="chat-settings-drawer__inner">
    <section v-if="userInfo" class="chat-settings-drawer__card chat-settings-drawer__user">
      <Avatar :id="userInfo.id" :size="36" class="chat-settings-drawer__user-avatar" :profile-enabled="true" />
      <div class="chat-settings-drawer__user-info">
        <div class="chat-settings-drawer__user-name">{{ userInfo.remark || userInfo.username }}</div>
        <span v-if="userInfo.account" class="chat-settings-drawer__user-id">{{ userInfo.account }}</span>
      </div>
      <button type="button" class="chat-settings-drawer__share-btn" @click="onShare">
        <svg class="chat-settings-drawer__share-icon" aria-hidden="true">
          <use href="#share" />
        </svg>
        <span>{{ t('message.chatSettings.share') }}</span>
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

    <section class="chat-settings-drawer__card">
      <button
        type="button"
        class="chat-settings-drawer__action chat-settings-drawer__action--danger"
        @click="onDeleteHistory">
        {{ t('message.chatSettings.deleteHistory') }}
      </button>
    </section>

    <button type="button" class="chat-settings-drawer__footer-action" @click="onDeleteFriend">
      {{ t('message.chatSettings.deleteFriend') }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { contactsApi, robotApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import { useChatStore } from '@/stores/chat/chat'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useForwardMessageModal } from '@/composables/useForwardMessageModal'
  import { useContactsStore } from '@/stores/user/contacts'
  import type { Message } from '@/types/api/message'
  import type { Robot } from '@/types/api/robot'
  import type { User } from '@/types/api/user'
  import { openChatRecord } from '@/utils/message/chatRecord'

  const props = defineProps<{
    userInfo: User | null
    chatId: string
    show: boolean
  }>()

  const emit = defineEmits<{
    'history-deleted': []
    'friend-deleted': []
  }>()

  const { t } = useI18n()
  const dialog = useDialog()
  const chatStore = useChatStore()
  const messageDbStore = useMessageDbStore()
  const { openForwardMessageModal } = useForwardMessageModal()
  const contactsStore = useContactsStore()

  const robots = ref<Robot[]>([])

  const shareMessage = computed<Message | null>(() => {
    if (!props.userInfo) return null
    return {
      id: `share-${props.userInfo.id}`,
      sessionId: '',
      fromId: props.userInfo.id,
      toId: '',
      msgType: 'ecard',
      content: {
        userId: props.userInfo.id,
        userName: props.userInfo.username
      },
      isShowTime: false,
      sceneType: SceneType.User,
      createdAt: '',
      updatedAt: ''
    }
  })

  const onShare = () => {
    if (!shareMessage.value) return
    openForwardMessageModal(shareMessage.value)
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

  const onDeleteFriend = () => {
    const userId = props.userInfo?.id
    if (!userId) return

    dialog.warning({
      title: t('message.chatSettings.deleteFriendConfirmTitle'),
      content: t('message.chatSettings.deleteFriendConfirmContent'),
      positiveText: t('message.chatSettings.deleteFriendConfirm'),
      negativeText: t('message.chatSettings.deleteFriendCancel'),
      showIcon: false,
      positiveButtonProps: { type: 'error' },
      negativeButtonProps: { ghost: false, size: 'small' },
      onPositiveClick: () => {
        return contactsApi.deleteFriend({ userId }).then((res) => {
          if (res.code === 0) {
            const sessionId = currentChat.value?.sessionId
            if (sessionId) {
              messageDbStore.deleteChatHistoryBySession(sessionId)
            }
            contactsStore.fetchFriendList()
            chatStore.refreshList()
            chatStore.clearSelectedChatId()
            emit('friend-deleted')
            return
          }
          window.$message.error(res.msg)
          return false
        })
      }
    })
  }

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
    () => props.show,
    (visible) => {
      if (visible) {
        fetchRobots()
      }
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

    &__share-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      border-radius: 999px;
      background: var(--bg-primary-color);
      font-size: 12px;
      color: var(--text-color);
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        color 0.2s ease;

      html[data-theme='dark'] & {
        background: color-mix(in srgb, var(--card-bg-color) 22%, var(--bg-secondary-color));
        border-color: color-mix(in srgb, var(--border-color) 35%, transparent);
      }

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }

    &__share-icon {
      width: 12px;
      height: 12px;
      color: currentColor;
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
