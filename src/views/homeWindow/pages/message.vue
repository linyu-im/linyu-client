<template>
  <div class="message">
    <Split :min-size="180" :max-size="300" :default-size="270">
      <template #first>
        <div class="chatlist">
          <div class="chatlist__title">
            <n-input
              size="small"
              type="text"
              style="width: 100%; height: 28px"
              class="text-14px"
              placeholder="搜索"
              clearable>
              <template #prefix>
                <svg class="size-16px text-[var(--text-secondary-color)]">
                  <use href="#search"></use>
                </svg>
              </template>
            </n-input>
            <n-dropdown :options="addMenuOptions" placement="bottom-start" trigger="click" @select="onAddMenuSelect">
              <n-button class="size-28px p-0 rounded-5px m-l-10px">
                <svg class="size-16px text-[var(--text-secondary-color)] bg-transparent">
                  <use href="#plus"></use>
                </svg>
              </n-button>
            </n-dropdown>
          </div>
          <n-scrollbar v-if="chatList.length > 0" style="margin-top: 10px">
            <div class="chatlist__content">
              <div
                v-for="item in chatList"
                :key="item.id"
                class="chatlist__item"
                :class="{ top: item.peerIsTop, active: globalStore.selectedChatId === item.id }"
                @click="() => onSelectChat(item)"
                @contextmenu="(e: MouseEvent) => onContextMenu(e, item)">
                <n-badge
                  :value="item.unreadNum"
                  :dot="item.peerIsMute && item.unreadNum > 0"
                  :max="99"
                  class="select-none pointer-events-none p-0 text-1px"
                  :offset="[-2, 2]">
                  <Avatar class="size-38px rounded-5px bg-#FFF" :id="item.peerId" />
                </n-badge>
                <div class="flex-1 min-w-0 m-l-12px h-40px flex flex-col justify-center gap-6px">
                  <div class="flex justify-between items-center h-14px">
                    <div class="text-14px truncate">{{ item.peerRemark ? item.peerRemark : item.peerName }}</div>
                    <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">
                      {{ formatTime(item.updatedAt) }}
                    </div>
                  </div>
                  <div class="flex justify-between items-center h-18px">
                    <component :is="toShowChatMessage(item.lastMsgContent)" />
                    <svg
                      v-if="item.peerIsMute"
                      class="size-16px text-[var(--text-secondary-color)] flex-shrink-0 m-l-5px">
                      <use href="#bell-mute"></use>
                    </svg>
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
        <chat-session v-if="hasActiveChat" ref="chatSessionRef" :to-id="activePeerId" />
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
  </div>
</template>
<script setup lang="tsx">
  import { chatApi } from '@/api'
  import { useGlobalStore } from '@/stores/global'
  import ChatSession from '@/components/ChatSession.vue'
  import { useWebSocketStore } from '@/stores/websocket'
  import { Chat } from '@/types/api/chat'
  import { Message } from '@/types/api/message'
  import { formatTime } from '@/utils/time'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const globalStore = useGlobalStore()
  const wsStore = useWebSocketStore()
  const chatSessionRef = ref<InstanceType<typeof ChatSession> | null>(null)

  const chatList = ref<Chat[]>([])

  const addMenuOptions = computed(() => [
    { label: () => t('message.addMenu.addContact'), key: 'addContact' },
    { label: () => t('message.addMenu.createGroup'), key: 'createGroup' }
  ])

  const onAddMenuSelect = (key: string) => {
    switch (key) {
      case 'addContact':
        window.$message.info('TODO: add contact')
        break
      case 'createGroup':
        window.$message.info('TODO: create group')
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
        key: 'delete'
      }
    ]
  })

  watch(
    () => wsStore.lastServerMessage,
    (msg) => {
      if (!msg) return
      if (msg.fromId !== activePeerId.value) return
      chatSessionRef.value?.appendMessage(msg)
    }
  )

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
    chatApi.top({ chatId: item.id, isTop: !item.peerIsTop }).then((res) => {
      if (res.code === 0) {
        onChatList()
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onMarkRead = (item: Chat) => {
    chatApi.markRead({ chatId: item.id }).then((res) => {
      if (res.code === 0) {
        onChatList()
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onToggleMute = (item: Chat) => {
    chatApi.mute({ chatId: item.id, isMute: !item.peerIsMute }).then((res) => {
      if (res.code === 0) {
        onChatList()
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  const onIndependentWindow = (item: Chat) => {
    window.$message.info('TODO: independent window for ' + item.peerName)
  }

  const onDelete = (item: Chat) => {
    chatApi.remove({ chatId: item.id }).then((res) => {
      if (res.code === 0) {
        if (globalStore.selectedChatId === item.id) {
          globalStore.setSelectedChatId('')
        }
        onChatList()
      } else {
        window.$message.error(res.msg)
      }
    })
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
          <span class="text-[var(--text-secondary-color)] text-12px truncate">[{t('message.msgType.sticker')}]</span>
        )
      default:
        return (
          <span class="text-[var(--text-secondary-color)] text-12px truncate">[{t('message.msgType.unknown')}]</span>
        )
    }
  }

  const activePeerId = computed(() => {
    const chat = chatList.value.find((item) => item.id === globalStore.selectedChatId)
    return chat?.peerId ?? ''
  })

  const hasActiveChat = computed(() => Boolean(activePeerId.value))

  const onSelectChat = (item: Chat) => {
    if (globalStore.selectedChatId === item.id) {
      globalStore.setSelectedChatId('')
      return
    }
    globalStore.setSelectedChatId(item.id)
  }

  const onChatList = () => {
    chatApi.list().then((res) => {
      if (res.code === 0 && res.data) {
        chatList.value = res.data
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  onMounted(() => {
    onChatList()
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
      background-color: var(--bg-primary-color);
    }

    .chatlist {
      display: flex;
      flex-direction: column;
      padding: 10px;
      height: 100%;

      .chatlist__title {
        display: flex;
        justify-content: center;
        flex-shrink: 0;
        padding: 0 5px;
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
    }
  }
</style>
