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

    <button type="button" class="chat-settings-drawer__footer-action">
      {{ t('message.chatSettings.deleteFriend') }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { robotApi } from '@/api'
  import { SceneType } from '@/constants/common'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import { useChatStore } from '@/stores/chat'
  import { useMessageDbStore } from '@/stores/messageDb'
  import { useMessageForwardStore } from '@/stores/messageForward'
  import type { Message } from '@/types/api/message'
  import type { Robot } from '@/types/api/robot'
  import type { UserInfoResult } from '@/types/api/user'
  import { openChatRecord } from '@/utils/chatRecord'

  const props = defineProps<{
    userInfo: UserInfoResult | null
    chatId: string
    show: boolean
  }>()

  const emit = defineEmits<{
    'history-deleted': []
  }>()

  const { t } = useI18n()
  const dialog = useDialog()
  const chatStore = useChatStore()
  const messageDbStore = useMessageDbStore()
  const messageForwardStore = useMessageForwardStore()

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
    messageForwardStore.open(shareMessage.value)
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
  @use './chatSettingsDrawer.scss';
</style>
