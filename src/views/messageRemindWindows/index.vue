<template>
  <div
    class="message-remind"
    :style="remindLayoutStyle"
    @mouseenter="onRemindMouseEnter"
    @mouseleave="onRemindMouseLeave">
    <header class="message-remind__header" data-tauri-drag-region>
      <span class="message-remind__brand" data-tauri-drag-region>{{ displayName }}</span>
      <button type="button" class="message-remind__header-action" @click="onCancelBlink">
        {{ t('messageRemind.cancelBlink') }}
      </button>
    </header>

    <n-scrollbar class="message-remind__list">
      <div class="message-remind__list-inner">
        <button
          v-for="item in remindItems"
          :key="item.sessionId"
          type="button"
          class="message-remind__item"
          @click="onItemClick(item)">
          <Avatar class="message-remind__avatar" :id="item.peerId" :type="item.peerType" :size="28" :round="true" />
          <div class="message-remind__name">{{ item.name }}</div>
          <span v-if="getUnreadNum(item.sessionId) > 0" class="message-remind__count">
            {{ getUnreadNum(item.sessionId) > 99 ? '99+' : getUnreadNum(item.sessionId) }}
          </span>
        </button>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
  import { listen } from '@tauri-apps/api/event'
  import { useI18n } from 'vue-i18n'
  import { SceneType } from '@/constants/common'
  import { useHomeTabStore } from '@/stores/app/homeTab'
  import {
    MESSAGE_REMIND_ITEM_HEIGHT,
    MESSAGE_REMIND_LIST_BOTTOM_PADDING,
    useMessageRemindStore,
    type MessageRemindItem,
    type MessageRemindTrayRect
  } from '@/stores/message/messageRemind'
  import { useUserStore } from '@/stores/user/user'
  import { createHomeWinodw } from '@/utils/desktop/window'

  const { t } = useI18n()
  const userStore = useUserStore()
  const homeTabStore = useHomeTabStore()
  const messageRemindStore = useMessageRemindStore()

  const displayName = computed(() => userStore.userInfo.username || 'Linyu')
  const remindItems = computed(() => messageRemindStore.items)

  const remindLayoutStyle = computed(() => {
    const visibleCount = Math.min(remindItems.value.length, 8)
    return {
      '--visible-item-count': String(visibleCount),
      '--item-height': `${MESSAGE_REMIND_ITEM_HEIGHT}px`,
      '--list-bottom-padding': `${MESSAGE_REMIND_LIST_BOTTOM_PADDING}px`
    }
  })

  let unlistenShow: (() => void) | null = null

  const closeRemindWindow = () => {
    messageRemindStore.hideWindow()
  }

  const onRemindMouseEnter = () => {
    messageRemindStore.setWindowHovered(true)
  }

  const onRemindMouseLeave = () => {
    messageRemindStore.setWindowHovered(false)
    messageRemindStore.scheduleHideWindow()
  }

  const onCancelBlink = () => {
    messageRemindStore.pauseBlink()
  }

  const getUnreadNum = (sessionId: string) => {
    return messageRemindStore.getUnreadNum(sessionId)
  }

  const onItemClick = (item: MessageRemindItem) => {
    void createHomeWinodw()
      .then(() => {
        if (item.chatId) {
          return homeTabStore.navigateTo('message', { chatId: item.chatId })
        }
        const sceneType = item.peerType === 'group' ? SceneType.Group : SceneType.User
        return homeTabStore.openMessageWithPeer(item.peerId, sceneType)
      })
      .then(() => {
        messageRemindStore.removeItem(item.sessionId)
        if (messageRemindStore.items.length === 0) {
          closeRemindWindow()
        } else {
          messageRemindStore.hideWindow()
        }
      })
  }

  watch(
    () => messageRemindStore.items.length,
    () => {
      void messageRemindStore.syncWindowSize()
    },
    { immediate: true }
  )

  onMounted(() => {
    messageRemindStore.bindWindowEvents()
    listen<MessageRemindTrayRect>('message-remind://show-near-tray', (event) => {
      void messageRemindStore.showNearTray(event.payload)
    }).then((unlisten) => {
      unlistenShow = unlisten
    })
  })

  onBeforeUnmount(() => {
    unlistenShow?.()
    unlistenShow = null
    messageRemindStore.setWindowHovered(false)
    messageRemindStore.cancelHideWindow()
  })
</script>

<style scoped lang="scss">
  .message-remind {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    user-select: none;
    color: var(--text-color);
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);

    &__header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      height: 32px;
      padding: 0 12px;
    }

    &__brand {
      flex: 1;
      min-width: 0;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__header-action {
      flex-shrink: 0;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary-color);
      cursor: pointer;
      outline: none;

      &:hover {
        color: var(--primary-color);
      }
    }

    &__list {
      flex-shrink: 0;
      height: calc(var(--visible-item-count) * var(--item-height) + var(--list-bottom-padding));
      min-height: 0;
      overflow: hidden;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-rail) {
        right: 2px;
      }
    }

    &__list-inner {
      box-sizing: border-box;
      padding: 0 8px var(--list-bottom-padding);
    }

    &__item {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      gap: 8px;
      box-sizing: border-box;
      width: 100%;
      height: var(--item-height);
      padding: 0 6px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      outline: none;
      transition: background-color 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--icon-hover-color) 85%, transparent);
      }
    }

    &__avatar {
      flex-shrink: 0;
      overflow: hidden;
    }

    &__name {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      line-height: 1.3;
      color: var(--text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__count {
      flex-shrink: 0;
      min-width: 12px;
      font-size: 12px;
      line-height: 1.3;
      color: var(--text-secondary-color);
      text-align: right;
    }
  }
</style>
