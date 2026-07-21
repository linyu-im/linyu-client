<template>
  <div class="tray">
    <div class="p-5px">
      <div class="tray__option" @click="onExitApp">{{ t('tray.exit') }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { defaultWindowIcon } from '@tauri-apps/api/app'
  import { Image } from '@tauri-apps/api/image'
  import { TrayIcon } from '@tauri-apps/api/tray'
  import { useI18n } from 'vue-i18n'
  import { useChatStore } from '@/stores/chat/chat'
  import { useMessageRemindStore } from '@/stores/message/messageRemind'
  import { initSystemTray, setTrayEvent, TRAY_ID } from '@/utils/desktop/tray'
  import { exitApp } from '@/utils/desktop/window'

  const BLINK_INTERVAL_MS = 500

  const { t } = useI18n()
  const chatStore = useChatStore()
  const messageRemindStore = useMessageRemindStore()

  let blinkTimer: ReturnType<typeof setInterval> | null = null
  let blinkShowNormal = true
  let normalTrayIcon: Image | null = null

  const ensureNormalTrayIcon = () => {
    if (normalTrayIcon) return Promise.resolve()
    return defaultWindowIcon().then((icon) => {
      normalTrayIcon = icon ?? null
    })
  }

  const stopTrayIconBlink = () => {
    if (blinkTimer) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
    blinkShowNormal = true

    return TrayIcon.getById(TRAY_ID).then((tray) => {
      if (!tray) return
      return ensureNormalTrayIcon().then(() => {
        if (normalTrayIcon) {
          return tray.setIcon(normalTrayIcon)
        }
      })
    })
  }

  const startTrayIconBlink = () => {
    if (blinkTimer) return Promise.resolve()

    return ensureNormalTrayIcon().then(() => {
      blinkShowNormal = true
      blinkTimer = setInterval(() => {
        blinkShowNormal = !blinkShowNormal
        TrayIcon.getById(TRAY_ID).then((currentTray) => {
          if (!currentTray) return
          void currentTray.setIcon(blinkShowNormal ? normalTrayIcon : null)
        })
      }, BLINK_INTERVAL_MS)
    })
  }

  initSystemTray().then(() => {
    watch(
      () =>
        chatStore.chatList.map((item) => ({
          sessionId: item.sessionId,
          unreadNum: item.unreadNum,
          peerName: item.peerName,
          peerRemark: item.peerRemark,
          peerIsMute: item.peerIsMute,
          lastMsgId: item.lastMsgContent?.id || '',
          updatedAt: item.updatedAt
        })),
      () => {
        messageRemindStore.syncFromChatList()
      },
      { deep: true, immediate: true }
    )

    watch(
      () => messageRemindStore.shouldBlink,
      (shouldBlink) => {
        if (shouldBlink) {
          void startTrayIconBlink()
          return
        }
        void stopTrayIconBlink()
      },
      { immediate: true }
    )
  })
  setTrayEvent()

  onBeforeUnmount(() => {
    if (blinkTimer) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
  })

  const onExitApp = () => {
    exitApp()
  }
</script>

<style scoped lang="scss">
  .tray {
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary-color);
    user-select: none;
    font-size: 14px;
    color: var(--text-color);

    .tray__option {
      cursor: pointer;
      color: var(--text-color);
      height: 30px;
      border-radius: 5px;
      display: flex;
      justify-content: center;
      align-items: center;

      &:hover {
        background-color: var(--primary-color);
        color: #fff;
      }
    }
  }
</style>
