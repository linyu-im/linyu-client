<template>
  <n-scrollbar class="message-list">
    <div class="message-list__inner">
      <template v-for="message in messages" :key="message.id">
        <Time v-if="message.isShowTime" :time="message.createdAt" />
        <div class="message-list__row" :class="{ 'message-list__row--self': isSelf(message) }">
          <Avatar class="message-list__avatar" :id="message.fromId" :type="message.fromType" :size="32" />
          <div
            class="message-list__bubble"
            :class="{
              'message-list__bubble--self':
                isSelf(message) && message.msgType !== 'file' && message.msgType !== 'ecard',
              'message-list__bubble--plain': isPlainBubble(message),
              'message-list__bubble--text': message.msgType === 'text',
              'message-list__bubble--file': message.msgType === 'file',
              'message-list__bubble--ecard': message.msgType === 'ecard'
            }">
            <Item :message="message" :is-self="isSelf(message)" />
          </div>
        </div>
      </template>
    </div>
  </n-scrollbar>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/stores/user'
  import type { Message } from '@/types/api/message'

  const userStore = useUserStore()

  defineProps({
    messages: {
      type: Array as PropType<Message[]>,
      default: () => []
    }
  })

  const isSelf = (message: Message) => {
    const uid = userStore.authInfo.userId
    if (uid) return message.fromId === uid
    return message.fromId === 'demo-self'
  }

  const isPlainBubble = (message: Message) => message.msgType === 'image' || message.msgType === 'video'
</script>

<style scoped lang="scss">
  .message-list {
    height: 100%;
    min-height: 0;

    :deep(.n-scrollbar-container) {
      height: 100%;
    }

    :deep(.n-scrollbar-content) {
      min-height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    &__inner {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 12px 16px 16px;
      font-size: 12px;
    }

    &__row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;

      &--self {
        flex-direction: row-reverse;
      }
    }

    &__avatar {
      flex-shrink: 0;
      border-radius: 4px;
      overflow: hidden;
    }

    &__bubble {
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 14px;
      background: var(--bg-primary-color);
      color: var(--text-primary-color);
      word-break: break-word;

      &--self {
        background: var(--primary-color);
        color: #fff;
      }

      &--text {
        box-sizing: border-box;
        max-width: 70%;
        width: fit-content;
      }

      &--file,
      &--ecard {
        padding: 0;
        background: var(--bg-primary-color);
        color: var(--text-primary-color);
      }

      &--plain {
        padding: 0;
        background: transparent;
        color: inherit;

        &.message-list__bubble--self {
          background: transparent;
          color: inherit;
        }
      }
    }
  }
</style>
