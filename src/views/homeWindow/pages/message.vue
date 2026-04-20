<template>
  <div class="message">
    <div class="chatlist">
      <div class="chatlist__title">
        <n-input
          size="small"
          type="text"
          style="width: 190px; height: 28px"
          class="text-14px"
          placeholder="搜索"
          clearable>
          <template #prefix>
            <svg class="size-16px text-[var(--text-secondary-color)]">
              <use href="#search"></use>
            </svg>
          </template>
        </n-input>
        <n-button class="size-28px p-0 rounded-5px m-l-10px">
          <svg class="size-16px text-[var(--text-secondary-color)]">
            <use href="#plus"></use>
          </svg>
        </n-button>
      </div>
      <n-scrollbar v-if="chatList.length > 0" style="margin-top: 10px">
        <div class="chatlist__content">
          <div
            v-for="item in chatList"
            :key="item.id"
            class="chatlist__item"
            :class="{ top: item.peerIsTop, active: globalStore.selectedChatId === item.id }"
            @click="() => onSelectChat(item)">
            <n-badge
              :value="item.unreadNum"
              :dot="item.peerIsMute && item.unreadNum > 0"
              :max="99"
              class="select-none pointer-events-none p-0 text-1px"
              :offset="[-2, 2]">
              <n-avatar class="size-38px rounded-5px bg-#FFF" fallback-src="/avatar.png" :src="item.peerAvatar" />
            </n-badge>
            <div class="flex-1 min-w-0 m-l-12px h-40px flex flex-col justify-center gap-6px">
              <div class="flex justify-between items-center h-14px">
                <div class="text-14px truncate">{{ item.peerName }}</div>
                <div class="text-[var(--text-secondary-color)] text-10px flex-shrink-0 m-l-5px">
                  {{ formatTime(item.updatedAt) }}
                </div>
              </div>
              <div class="flex justify-between items-center h-18px">
                <component :is="toShowChatMessage(item.lastMsgContent)" />
                <svg v-if="item.peerIsMute" class="size-16px text-[var(--text-secondary-color)] flex-shrink-0 m-l-5px">
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
    <div class="content">
      <linyu-empty />
    </div>
  </div>
</template>
<script setup lang="tsx">
  import { chatApi } from '@/api'
  import { useGlobalStore } from '@/stores/global'
  import { Chat } from '@/types/api/chat'
  import { Message } from '@/types/api/message'
  import { formatTime } from '@/utils/time'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const globalStore = useGlobalStore()

  const chatList = ref<Chat[]>([])

  const toShowChatMessage = (msg: Message | null) => {
    if (!msg) return <span />
    switch (msg.msgType) {
      case 'text':
        return <span class="text-[var(--text-secondary-color)] text-12px truncate">{msg.content.text}</span>
      case 'image':
        return <span>[{t('message.msgType.image')}]</span>
      case 'video':
        return <span>[{t('message.msgType.video')}]</span>
      case 'file':
        return (
          <span>
            [{t('message.msgType.file')}] {msg.content.fileName}
          </span>
        )
      case 'ecard':
        return (
          <span>
            [{t('message.msgType.ecard')}] {msg.content.userName}
          </span>
        )
      case 'voice':
        return <span>[{t('message.msgType.voice')}]</span>
      default:
        return <span>[{t('message.msgType.unknown')}]</span>
    }
  }

  const onSelectChat = (item: Chat) => {
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

    .chatlist {
      display: flex;
      flex-direction: column;
      width: 240px;
      padding: 10px;
      border-right: 1px var(--divider-color) solid;

      .chatlist__title {
        display: flex;
        justify-content: center;
        flex-shrink: 0;
      }

      .chatlist__content {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .chatlist__item {
          border-radius: 5px;
          width: 100%;
          display: flex;
          padding: 10px;
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
    .content {
      flex: 1;
    }
  }
</style>
