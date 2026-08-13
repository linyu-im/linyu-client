<template>
  <div class="tray">
    <div class="tray__inner">
      <template v-if="menuLoggedIn">
        <div class="tray__option" @click="onOpenLinyu">{{ t('tray.open') }}</div>
        <div class="tray__option" @click="onLock">{{ t('tray.lock') }}</div>
        <div class="tray__option" @click="onSettings">{{ t('tray.settings') }}</div>
        <div class="tray__divider" />
      </template>
      <div class="tray__option" @click="onExitApp">{{ t('tray.exit') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { defaultWindowIcon } from '@tauri-apps/api/app'
  import { listen } from '@tauri-apps/api/event'
  import { Image } from '@tauri-apps/api/image'
  import { TrayIcon } from '@tauri-apps/api/tray'
  import { useI18n } from 'vue-i18n'
  import { TRAY_MENU_SYNC_EVENT } from '@/constants/event'
  import { useChatStore } from '@/stores/chat/chat'
  import { useMessageRemindStore } from '@/stores/message/messageRemind'
  import { useSessionLockStore } from '@/stores/app/sessionLock'
  import { useUserStore } from '@/stores/user/user'
  import {
    hideTrayMenuWindow,
    initSystemTray,
    openMainWindow,
    setTrayEvent,
    setTrayMenuLoggedIn,
    shouldShowFullTrayMenu,
    TRAY_ID
  } from '@/utils/desktop/tray'
  import { createSetWinodw, exitApp } from '@/utils/desktop/window'

  const BLINK_INTERVAL_MS = 500

  const { t } = useI18n()
  const chatStore = useChatStore()
  const messageRemindStore = useMessageRemindStore()
  const userStore = useUserStore()
  const sessionLock = useSessionLockStore()

  const menuLoggedIn = ref(false)

  const applyMenuLoggedIn = (loggedIn: boolean) => {
    menuLoggedIn.value = loggedIn
    setTrayMenuLoggedIn(loggedIn)
  }

  const refreshMenuLoggedIn = () => {
    return shouldShowFullTrayMenu().then((loggedIn) => {
      applyMenuLoggedIn(loggedIn)
    })
  }

  let unlistenMenuSync: (() => void) | null = null

  onMounted(() => {
    void refreshMenuLoggedIn()
    void listen<{ loggedIn: boolean }>(TRAY_MENU_SYNC_EVENT, (event) => {
      applyMenuLoggedIn(!!event.payload?.loggedIn)
    }).then((unlisten) => {
      unlistenMenuSync = unlisten
    })
  })

  // 登出 / 锁屏时收起完整菜单；登录或解锁后再按 home 确认
  watch(
    () => [!!userStore.authInfo.isLoggedIn, sessionLock.locked] as const,
    ([loggedIn, locked]) => {
      if (!loggedIn || locked) {
        applyMenuLoggedIn(false)
        return
      }
      void refreshMenuLoggedIn()
    }
  )

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
    unlistenMenuSync?.()
    unlistenMenuSync = null
    if (blinkTimer) {
      clearInterval(blinkTimer)
      blinkTimer = null
    }
  })

  const runMenuAction = (action: () => void | Promise<void>) => {
    void hideTrayMenuWindow().then(() => action())
  }

  const onOpenLinyu = () => {
    runMenuAction(() => openMainWindow())
  }

  const onLock = () => {
    runMenuAction(() => {
      sessionLock.lock()
    })
  }

  const onSettings = () => {
    runMenuAction(() => {
      void createSetWinodw()
    })
  }

  const onExitApp = () => {
    runMenuAction(() => exitApp())
  }
</script>

<style scoped lang="scss">
  .tray {
    height: 100vh;
    width: 100vw;
    background-color: var(--bg-primary-color);
    user-select: none;
    font-size: 13px;
    color: var(--text-color);
    box-sizing: border-box;

    &__inner {
      padding: 5px;
      display: flex;
      flex-direction: column;
    }

    &__option {
      cursor: pointer;
      color: var(--text-color);
      height: 30px;
      padding: 0 10px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      white-space: nowrap;

      &:hover {
        background-color: var(--button-soft-bg);
      }
    }

    &__divider {
      height: 1px;
      margin: 4px 6px;
      background-color: var(--border-color);
      flex-shrink: 0;
    }
  }
</style>
