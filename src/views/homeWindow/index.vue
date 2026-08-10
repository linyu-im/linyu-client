<template>
  <div class="home">
    <!-- 顶部 -->
    <ToolBar class="home__header" @maximized="(is) => (isMaximize = is)">
      <div class="w-50px flex items-center justify-center">
        <div
          class="text-12px m-l-2 font-900 select-none bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-strong-color)] bg-clip-text text-transparent">
          Linyu
        </div>
      </div>
      <div class="flex justify-between items-center flex-1 pointer-events-none">
        <div class="m-l-10px flex items-center pointer-events-auto">
          <div class="flex position-relative items-center">
            <Avatar :id="userStore.userInfo.id" class="size-24px rounded-5px bg-#FFF" :profile-enabled="true" />
          </div>
          <div class="m-l-8px text-14px font-bold">{{ userStore.userInfo.username }}</div>
          <div
            class="flex items-center justify-center text-12px cursor-pointer text-[var(--text-muted-color)] m-l-10px"
            @click="() => createEmotionWinodw()">
            <EmotionIcon v-if="userStore.userInfo.emotionId" :url="userStore.userInfo.emotionUrl" :size="20" />
            <div class="m-l-2px">
              {{ userStore.userInfo.emotionId ? userStore.userInfo.emotionName : t('home.emotion.setText') }}
            </div>
          </div>
        </div>
        <div class="flex pointer-events-auto">
          <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
          <SvgIconButton
            :href="isMaximize ? '#restore' : '#maximize'"
            @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximize = !v))" />
          <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="onCloseMainWindow" />
        </div>
      </div>
    </ToolBar>
    <!-- 主体 -->
    <div class="home__layout">
      <!-- 左侧 -->
      <ToolBar class="home__sider" @maximized="(is) => (isMaximize = is)">
        <div class="flex flex-col gap-8px">
          <n-popover v-for="item in menuOptions" :key="item.id" :show-arrow="false" placement="right" trigger="hover">
            <template #trigger>
              <n-badge
                :show="homeNavBadgeStore.counts[item.id] > 0"
                dot
                :color="'var(--red)'"
                class="home__tab-badge"
                :offset="[-2, 2]">
                <SvgIconButton
                  :size="34"
                  :radius="5"
                  :href="homeTabStore.activeTabId === item.id ? item.activeIcon : item.icon"
                  :active="item.id === homeTabStore.activeTabId"
                  icon-size="22px"
                  @click="() => onClickMenu(item)" />
              </n-badge>
            </template>
            <span class="select-none">{{ item.label }}</span>
          </n-popover>
        </div>
        <div>
          <n-dropdown
            :z-index="100"
            :options="moreOptions"
            trigger="click"
            placement="right"
            transfer
            @select="onMoreMenuSelect">
            <n-popover :z-index="99" :show-arrow="false" placement="right" trigger="hover">
              <template #trigger>
                <n-badge :show="homeNavBadgeStore.counts.more > 0" dot :color="'var(--red)'" :offset="[-2, 2]">
                  <SvgIconButton :size="34" :radius="5" href="#list" icon-size="22px" />
                </n-badge>
              </template>
              <span class="select-none">{{ t('home.options.more.text') }}</span>
            </n-popover>
          </n-dropdown>
        </div>
      </ToolBar>
      <!-- 内容：keep-alive 缓存各子页面状态 -->
      <div class="home__content">
        <UpdateModal v-model:show="showUpdateModal" />
        <router-view v-slot="{ Component, route }">
          <keep-alive :include="HOME_PAGE_NAMES">
            <component :is="Component" v-if="Component" :key="route.name" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import UpdateModal from '@/components/Modal/UpdateModal.vue'
  import { dismissTopEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { userApi } from '@/api'
  import { HOME_PAGE_NAMES, prefetchHomePages } from '@/router/home'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { useAppUpdateStore } from '@/stores/app/appUpdate'
  import { useHomeNavBadgeStore } from '@/stores/app/homeNavBadge'
  import { HOME_TAB_NAVIGATE_EVENT } from '@/constants/event'
  import { LOGIN_WINDOW_LABEL } from '@/constants/window'
  import { useHomeTabStore, type HomeTabId, type HomeTabNavigatePayload } from '@/stores/app/homeTab'
  import { useChatStore } from '@/stores/chat/chat'
  import { useSpaceDownloadStore } from '@/stores/cloudDrive/spaceDownload'
  import { useSpaceUploadStore } from '@/stores/cloudDrive/spaceUpload'
  import { useUserStore } from '@/stores/user/user'
  import { initOsFileDropListener } from '@/utils/file/nativeFileDrop'
  import { connectWebSocket, disconnectWebSocket } from '@/utils/network/websocket'
  import {
    createEmotionWinodw,
    createFeedbackWinodw,
    createPluginRuntimeWindow,
    createSetWinodw,
    closeWebviewWindow,
    exitApp,
    hideCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'
  import { openSearchChatRecord } from '@/utils/message/searchChatRecord'
  import { ensureNotificationActionListener, stopNotificationActionListener } from '@/utils/desktop/notification'
  import { listen } from '@tauri-apps/api/event'
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  import { useI18n } from 'vue-i18n'
  import { useRoute, useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'

  const userStore = useUserStore()
  const appSettings = useAppSettingsStore()
  const homeTabStore = useHomeTabStore()
  const homeNavBadgeStore = useHomeNavBadgeStore()
  const appUpdateStore = useAppUpdateStore()
  const chatStore = useChatStore()
  const spaceUploadStore = useSpaceUploadStore()
  const spaceDownloadStore = useSpaceDownloadStore()
  const { needUpdate, needForce } = storeToRefs(appUpdateStore)
  const { counts: navBadgeCounts } = storeToRefs(homeNavBadgeStore)

  initOsFileDropListener().catch(() => undefined)

  const isMaximize = ref(false)
  const showUpdateModal = ref(false)
  let unlistenCloseRequested: (() => void) | undefined
  let unlistenHomeTabNavigate: (() => void) | undefined

  const onCloseMainWindow = () => {
    if (appSettings.general.closeMainPanelAction === 'exit') {
      exitApp()
    } else {
      hideCurrentWindow()
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return

    if (dismissTopEscapeOverlay()) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    onCloseMainWindow()
  }

  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()

  const menuOptions = computed(() => [
    {
      id: 'message' as HomeTabId,
      label: t('home.options.message'),
      icon: '#message',
      activeIcon: '#message-active',
      path: '/home/message'
    },
    {
      id: 'contacts' as HomeTabId,
      label: t('home.options.contacts'),
      icon: '#user',
      activeIcon: '#user-active',
      path: '/home/contacts'
    },
    {
      id: 'moment' as HomeTabId,
      label: t('home.options.moment'),
      icon: '#moment',
      activeIcon: '#moment-active',
      path: '/home/moment'
    },
    {
      id: 'ai' as HomeTabId,
      label: t('home.options.ai'),
      icon: '#ai',
      activeIcon: '#ai-active',
      path: '/home/ai'
    },
    {
      id: 'drive' as HomeTabId,
      label: t('home.options.drive'),
      icon: '#drive',
      activeIcon: '#drive-active',
      path: '/home/drive'
    },
    {
      id: 'application' as HomeTabId,
      label: t('home.options.application'),
      icon: '#application',
      activeIcon: '#application-active',
      path: '/home/application'
    }
  ])

  const moreOptions = computed(() => [
    {
      label: () =>
        h(
          'span',
          {
            style: {
              position: 'relative',
              display: 'inline-block',
              alignSelf: 'center',
              lineHeight: '1.2',
              paddingRight: navBadgeCounts.value.more > 0 ? '10px' : '0'
            }
          },
          [
            t('home.options.more.update'),
            navBadgeCounts.value.more > 0
              ? h('span', {
                  style: {
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'var(--red)',
                    transform: 'translate(50%, -35%)'
                  }
                })
              : null
          ]
        ),
      key: 'update'
    },
    {
      label: () => t('home.options.more.feedback'),
      key: 'feedback'
    },
    {
      label: () => t('home.options.more.searchChatRecord'),
      key: 'searchChatRecord'
    },
    {
      label: () => t('home.options.more.setting'),
      key: 'setting'
    },
    {
      label: () => t('home.options.more.exit'),
      key: 'exit'
    }
  ])

  const syncMenuFromRoute = () => {
    homeTabStore.syncActiveTabFromPath(route.path)
  }

  const onMoreMenuSelect = (key: string) => {
    if (key === 'setting') {
      createSetWinodw()
    } else if (key === 'update') {
      appUpdateStore
        .check()
        .then((info) => {
          if (info.needUpdate || info.needForce) {
            showUpdateModal.value = true
          } else {
            window.$message?.success(t('update.latest'))
          }
        })
        .catch(() => {
          window.$message?.error(t('update.checkFailed'))
        })
    } else if (key === 'feedback') {
      createFeedbackWinodw()
    } else if (key === 'searchChatRecord') {
      openSearchChatRecord()
    } else if (key === 'exit') {
      exitApp()
    }
  }

  const onClickMenu = (item: { id: HomeTabId; path: string }) => {
    if (homeTabStore.activeTabId === item.id && route.path === item.path) {
      return
    }
    homeTabStore.navigateTo(item.id)
  }

  watch(() => route.path, syncMenuFromRoute, { immediate: true })

  watch(
    () => homeTabStore.activeTabId,
    (tabId) => {
      const targetPath = menuOptions.value.find((item) => item.id === tabId)?.path
      if (targetPath && route.path !== targetPath) {
        void router.push(targetPath)
      }
    }
  )

  watch(
    () => chatStore.chatList.map((item) => item.unreadNum),
    () => {
      homeNavBadgeStore.syncMessageFromChatList(chatStore.chatList)
    },
    { immediate: true }
  )

  watch(
    [() => spaceUploadStore.tasks, () => spaceDownloadStore.tasks],
    () => {
      homeNavBadgeStore.syncDriveFromTasks(spaceUploadStore.tasks, spaceDownloadStore.tasks)
    },
    { deep: true, immediate: true }
  )

  watch(
    [needUpdate, needForce],
    ([update, force]) => {
      homeNavBadgeStore.syncMoreFromUpdate(update, force)
    },
    { immediate: true }
  )

  const onCurrentUserInfo = () => {
    userApi.currentUserInfo().then((res) => {
      if (res.code === 0 && res.data) {
        userStore.setUserInfo(res.data)
      } else {
        window.$message.error(res.msg)
      }
    })
  }

  onMounted(() => {
    void connectWebSocket().catch((err) => console.error('[WebSocket] connect failed:', err))
    void createPluginRuntimeWindow()
    void ensureNotificationActionListener()
    onCurrentUserInfo()
    void homeNavBadgeStore.refreshContactsBadges()
    prefetchHomePages(route.name as string)
    window.addEventListener('keydown', onKeyDown)
    void appUpdateStore
      .check({ silent: true })
      .then((info) => {
        if (info.needUpdate || info.needForce) {
          showUpdateModal.value = true
        }
      })
      .catch(() => undefined)
    void listen<HomeTabNavigatePayload>(HOME_TAB_NAVIGATE_EVENT, (event) => {
      const { tabId, payload } = event.payload
      if (!tabId) return
      void homeTabStore.navigateTo(tabId, payload)
    }).then((unlisten) => {
      unlistenHomeTabNavigate = unlisten
    })
    void WebviewWindow.getCurrent()
      .onCloseRequested((event) => {
        event.preventDefault()
        onCloseMainWindow()
      })
      .then((unlisten) => {
        unlistenCloseRequested = unlisten
      })
    nextTick(() => {
      ShowCurrentWindow()
      void closeWebviewWindow(LOGIN_WINDOW_LABEL)
    })
  })

  onUnmounted(() => {
    unlistenCloseRequested?.()
    unlistenHomeTabNavigate?.()
    void stopNotificationActionListener()
    window.removeEventListener('keydown', onKeyDown)
    void disconnectWebSocket().catch((err) => console.error('[WebSocket] disconnect failed:', err))
  })
</script>

<style scoped lang="scss">
  .home {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
    background-color: transparent;
    overflow: hidden;

    .home__header {
      height: 38px;
      display: flex;
      align-items: center;
      padding: 0 3px 0 0;
      user-select: none;
      flex-shrink: 0;
    }

    .home__layout {
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      height: calc(100% - 38px);
      background-color: var(--toolbar-bg-color);
      overflow: hidden;

      .home__sider {
        width: 50px;
        background-color: transparent;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 10px 0;
        align-items: center;
        flex-shrink: 0;

        .home__sider-btn {
          height: 34px;
          width: 34px;
          text-align: center;
          border-radius: 5px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .home__tab-badge {
          display: flex;
        }
      }

      .home__content {
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
        background-color: var(--bg-secondary-color);
        border-radius: 5px 0 0 0;
      }
    }
  }
</style>
