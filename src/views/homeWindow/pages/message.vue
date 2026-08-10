<template>
  <div class="message">
    <Split :min-size="220" :max-size="320" :default-size="270">
      <template #first>
        <div class="chatlist">
          <div class="chatlist__toolbar">
            <ContactsSearchPopover :placeholder="t('message.searchPlaceholder')" />
            <n-dropdown :options="addMenuOptions" placement="bottom-start" trigger="click" @select="onAddMenuSelect">
              <n-button class="chatlist__toolbar-btn">
                <svg class="size-16px text-[var(--text-secondary-color)] bg-transparent">
                  <use href="#plus"></use>
                </svg>
              </n-button>
            </n-dropdown>
          </div>
          <div v-if="messageDbStore.syncingMessages" class="chatlist__sync-tip">
            <span class="chatlist__sync-spinner" />
            <span>{{ t('message.syncingMessages') }}</span>
          </div>
          <n-scrollbar v-if="chatStore.chatList.length > 0" style="margin-top: 10px">
            <div class="chatlist__content">
              <div
                v-for="item in chatStore.chatList"
                :key="item.id"
                class="chatlist__item"
                :class="{ top: item.peerIsTop, active: chatStore.selectedChatId === item.id }"
                @click="() => onSelectChat(item)"
                @contextmenu="(e: MouseEvent) => onContextMenu(e, item)">
                <n-badge
                  :value="item.unreadNum"
                  :dot="item.peerIsMute"
                  :show="item.unreadNum > 0"
                  :max="99"
                  class="chatlist__badge select-none pointer-events-none p-0 text-1px"
                  :offset="[-2, 2]">
                  <Avatar class="size-38px rounded-5px bg-#FFF" :id="item.peerId" :type="item.sceneType" />
                </n-badge>
                <div class="flex-1 min-w-0 m-l-12px h-40px flex flex-col justify-center gap-6px">
                  <div class="flex justify-between items-center h-14px">
                    <div class="text-14px truncate">{{ item.peerRemark ? item.peerRemark : item.peerName }}</div>
                    <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">
                      {{ formatTime(item.updatedAt) }}
                    </div>
                  </div>
                  <div class="flex justify-between items-center h-14px">
                    <component :is="toShowChatMessage(item.lastMsgContent)" />
                    <div class="flex items-center flex-shrink-0 m-l-5px gap-4px">
                      <svg v-if="item.peerIsTop" class="size-14px text-[var(--text-secondary-color)] flex-shrink-0">
                        <use href="#pin"></use>
                      </svg>
                      <svg v-if="item.peerIsMute" class="size-14px text-[var(--text-secondary-color)] flex-shrink-0">
                        <use href="#bell-mute"></use>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </n-scrollbar>
          <div
            v-else
            class="flex-1 flex w-full h-full justify-center items-center text-[12px] text-[var(--text-secondary-color)]">
            {{ t('message.noChat') }}
          </div>
        </div>
      </template>
      <template #second>
        <chat-session v-if="activeChat" ref="chatSessionRef" :chat="activeChat" />
        <div v-else class="message__empty">
          <LinyuEmpty />
        </div>
      </template>
    </Split>
    <n-dropdown
      trigger="manual"
      placement="bottom-start"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :show="contextMenuShow"
      @select="onContextMenuSelect"
      @clickoutside="onContextMenuClickoutside" />
    <CreateGroupModal v-model:show="showCreateGroupModal" />
  </div>
</template>
<script setup lang="tsx">
  defineOptions({ name: 'message' })
  import { useChatStore } from '@/stores/chat/chat'
  import { useChatDetachedStore } from '@/stores/chat/chatDetached'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useMessageRemindStore } from '@/stores/message/messageRemind'
  import ChatSession from '@/components/Chat/ChatSession.vue'
  import ContactsSearchPopover from '@/components/Contacts/ContactsSearchPopover.vue'
  import CreateGroupModal from '@/components/Modal/CreateGroupModal.vue'
  import { Chat } from '@/types/api/chat'
  import { Message } from '@/types/api/message'
  import { formatTime } from '@/utils/common/time'
  import { formatCallRecordSummary } from '@/utils/message/callRecord'
  import { createAddContactsWindow, createChatSessionWindow, hasChatSessionWindow } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const chatStore = useChatStore()
  const chatDetachedStore = useChatDetachedStore()
  const messageDbStore = useMessageDbStore()
  const messageRemindStore = useMessageRemindStore()
  const chatSessionRef = ref<InstanceType<typeof ChatSession> | null>(null)
  const showCreateGroupModal = ref(false)
  const messagePageActive = ref(true)

  const addMenuOptions = computed(() => [
    { label: () => t('message.addMenu.addContact'), key: 'addContact' },
    { label: () => t('message.addMenu.createGroup'), key: 'createGroup' }
  ])

  const onAddMenuSelect = (key: string) => {
    switch (key) {
      case 'addContact':
        createAddContactsWindow()
        break
      case 'createGroup':
        showCreateGroupModal.value = true
        break
    }
  }

  const contextMenuShow = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const contextMenuTarget = ref<Chat | null>(null)

  const contextMenuOptions = computed(() => {
    const item = contextMenuTarget.value
    if (!item) return []
    return [
      {
        label: () => t(item.peerIsTop ? 'message.contextMenu.cancelTop' : 'message.contextMenu.top'),
        key: 'toggleTop'
      },
      {
        label: () => t('message.contextMenu.markRead'),
        key: 'markRead',
        disabled: item.unreadNum === 0
      },
      {
        label: () => t(item.peerIsMute ? 'message.contextMenu.cancelMute' : 'message.contextMenu.mute'),
        key: 'toggleMute'
      },
      {
        label: () => t('message.contextMenu.independentWindow'),
        key: 'independentWindow'
      },
      { type: 'divider' as const, key: 'd2' },
      {
        label: () => t('message.contextMenu.delete'),
        key: 'delete',
        props: { class: 'menu-item--danger' }
      }
    ]
  })

  const onContextMenu = (e: MouseEvent, item: Chat) => {
    e.preventDefault()
    contextMenuTarget.value = item
    contextMenuX.value = e.clientX
    contextMenuY.value = e.clientY
    nextTick(() => {
      contextMenuShow.value = true
    })
  }

  const onContextMenuClickoutside = () => {
    contextMenuShow.value = false
  }

  const onGlobalWheel = (e: WheelEvent) => {
    if (contextMenuShow.value) {
      e.preventDefault()
      contextMenuShow.value = false
    }
  }

  watch(contextMenuShow, (show) => {
    if (show) {
      document.addEventListener('wheel', onGlobalWheel, { passive: false })
    } else {
      document.removeEventListener('wheel', onGlobalWheel)
    }
  })

  onBeforeUnmount(() => {
    document.removeEventListener('wheel', onGlobalWheel)
  })

  const onContextMenuSelect = (key: string) => {
    contextMenuShow.value = false
    const item = contextMenuTarget.value
    if (!item) return
    switch (key) {
      case 'toggleTop':
        onToggleTop(item)
        break
      case 'markRead':
        onMarkRead(item)
        break
      case 'toggleMute':
        onToggleMute(item)
        break
      case 'independentWindow':
        onIndependentWindow(item)
        break
      case 'delete':
        onDelete(item)
        break
    }
  }

  const onToggleTop = (item: Chat) => {
    chatStore.toggleTop(item.id, !item.peerIsTop)
  }

  const onMarkRead = (item: Chat) => {
    chatStore.markRead(item.id)
  }

  const onToggleMute = (item: Chat) => {
    chatStore.toggleMute(item.id, !item.peerIsMute)
  }

  const onIndependentWindow = (item: Chat) => {
    chatStore.detachChat(item.id)
    createChatSessionWindow(item)
  }

  const onDelete = (item: Chat) => {
    if (chatStore.selectedChatId === item.id) {
      chatStore.clearSelectedChatId()
    }
    chatStore.attachChat(item.id)
    chatStore.removeItem(item.id)
  }

  const toShowChatMessage = (msg: Message | null) => {
    if (!msg) return <span />
    switch (msg.msgType) {
      case 'text':
        return <span class="text-[var(--text-secondary-color)] text-12px truncate">{msg.content.text}</span>
      case 'image':
        return <span class="text-[var(--text-secondary-color)] text-12px truncate">[{t('message.msgType.image')}]</span>
      case 'video':
        return <span class="text-[var(--text-secondary-color)] text-12px truncate">[{t('message.msgType.video')}]</span>
      case 'file':
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">
            [{t('message.msgType.file')}] {msg.content.fileName}
          </span>
        )
      case 'cloud_share': {
        const files = msg.content.files || []
        const firstName = files[0]?.shareName || ''
        const previewName =
          files.length > 1 ? t('message.cloudShare.multiName', { name: firstName, count: files.length }) : firstName
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">
            [{t('message.msgType.cloud_share')}] {previewName}
          </span>
        )
      }
      case 'ecard':
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">
            [{t('message.msgType.ecard')}] {msg.content.userName}
          </span>
        )
      case 'voice':
        return <span class="text-[var(--text-secondary-color)] text-12px truncate">[{t('message.msgType.voice')}]</span>
      case 'sticker':
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">
            [{t('message.msgType.sticker')}] {msg.content.stickerName}
          </span>
        )
      case 'call_record':
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">
            {formatCallRecordSummary(msg.content, t, { withType: true })}
          </span>
        )
      default:
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">[{t('message.msgType.unknown')}]</span>
        )
    }
  }

  const activeChat = computed(() => {
    const id = chatStore.selectedChatId
    if (!id || chatStore.isDetachedChat(id)) return null
    return chatStore.chatList.find((item) => item.id === id) ?? null
  })

  const hasActiveChat = computed(() => Boolean(activeChat.value))

  watch(
    () => [chatStore.selectedChatId, chatDetachedStore.detachedChatIds] as const,
    () => {
      chatStore.reportActiveSessions(messagePageActive.value)
    },
    { deep: true }
  )

  const onSelectChat = (item: Chat) => {
    hasChatSessionWindow(item.id).then((exists) => {
      if (exists) {
        chatStore.detachChat(item.id)
        createChatSessionWindow(item)
        return
      }

      // 窗口已关但 detached 残留时清掉，再按普通会话选中
      chatStore.attachChat(item.id)

      if (chatStore.selectedChatId === item.id) {
        chatStore.clearSelectedChatId()
        return
      }
      chatStore.setSelectedChatId(item.id)
    })
  }

  const reloadActiveChatMessages = () => {
    if (!hasActiveChat.value) return
    nextTick(() => {
      chatSessionRef.value?.reloadMessages()
    })
  }

  watch(
    () => messageDbStore.syncingMessages,
    (syncing, prevSyncing) => {
      if (prevSyncing && !syncing) {
        reloadActiveChatMessages()
      }
    }
  )

  onMounted(() => {
    chatStore.loadList(true).then(() => {
      chatStore.reportActiveSessions(messagePageActive.value)
    })
  })

  onActivated(() => {
    messagePageActive.value = true
    chatStore.reportActiveSessions(true)
    // 从其它 Tab 回来时，若仍选中会话，补已读（离开期间 isChatActive 为 false 会累计未读）
    if (chatStore.selectedChatId && !chatStore.isDetachedChat(chatStore.selectedChatId)) {
      void chatStore.markRead(chatStore.selectedChatId).then(() => {
        messageRemindStore.syncFromChatList()
      })
    }
    chatStore.loadList()
  })

  onDeactivated(() => {
    messagePageActive.value = false
    chatStore.reportActiveSessions(false)
  })
</script>
<style scoped lang="scss">
  .message {
    display: flex;
    height: 100%;

    .message__empty {
      display: flex;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-content-color);
    }

    .chatlist {
      display: flex;
      flex-direction: column;
      padding: 10px;
      height: 100%;

      .chatlist__toolbar {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        padding: 0 5px;
      }

      .chatlist__toolbar-btn {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        padding: 0;
        margin-left: 10px;
        border-radius: 5px;
      }

      .chatlist__sync-tip {
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-shrink: 0;
        height: 24px;
        margin-top: 10px;
        padding: 8px;
        font-size: 12px;
        line-height: 1;
        color: var(--text-secondary-color);
        background-color: color-mix(in srgb, var(--primary-color) 6%, var(--bg-primary-color));
        border-radius: 3px;
      }

      .chatlist__sync-spinner {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        border: 2px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
        border-top-color: var(--primary-color);
        border-radius: 50%;
        animation: chatlist-sync-spin 0.8s linear infinite;
      }

      @keyframes chatlist-sync-spin {
        to {
          transform: rotate(360deg);
        }
      }

      .chatlist__content {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .chatlist__item {
          border-radius: 5px;
          width: 100%;
          display: flex;
          padding: 12px 10px;
          align-items: center;
          user-select: none;
          box-sizing: border-box;
          border: 1px transparent solid;

          &:hover,
          &.top:hover {
            background-color: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
          }

          &.top {
            background-color: var(--card-bg-color);
          }

          &.active {
            background-color: color-mix(in srgb, var(--primary-color) 5%, transparent);
            border: 1px color-mix(in srgb, var(--primary-color) 60%, transparent) solid;
          }
        }
      }

      .chatlist__badge {
        :deep(.n-badge-sup.fade-in-scale-up-transition-enter-active),
        :deep(.n-badge-sup.fade-in-scale-up-transition-leave-active) {
          transition: none !important;
        }
      }
    }
  }

  :global(.n-dropdown-menu .menu-item--danger:hover) {
    color: var(--red) !important;
  }
</style>
