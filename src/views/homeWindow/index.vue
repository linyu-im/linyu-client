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
        <!-- 头像状态 -->
        <div class="m-l-10px flex items-center pointer-events-auto">
          <div class="flex position-relative items-center">
            <Avatar :id="userStore.userInfo.id" class="size-24px rounded-5px bg-#FFF" />
          </div>
          <div class="m-l-8px text-14px font-bold">{{ userStore.userInfo.username }}</div>
          <div
            class="flex items-center justify-center text-12px cursor-pointer text-[var(--text-muted-color)] m-l-10px"
            @click="() => createEmotionWinodw()">
            <img v-if="userStore.userInfo.emotionId" class="size-14px" :src="userStore.userInfo.emotionUrl" alt="" />
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
          <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="hideCurrentWindow" />
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
              <SvgIconButton
                :size="34"
                :radius="5"
                :href="seletedMenuOption === item.id ? item.activeIcon : item.icon"
                :active="item.id === seletedMenuOption"
                icon-size="22px"
                @click="() => onClickMenu(item)" />
            </template>
            <span class="select-none">{{ item.label }}</span>
          </n-popover>
        </div>
        <div>
          <n-dropdown :z-index="100" :options="moreOptions" trigger="click" placement="right" transfer>
            <n-popover :z-index="99" :show-arrow="false" placement="right" trigger="hover">
              <template #trigger>
                <SvgIconButton :size="34" :radius="5" href="#list" icon-size="22px" />
              </template>
              <span class="select-none">{{ t('home.options.more.text') }}</span>
            </n-popover>
          </n-dropdown>
        </div>
      </ToolBar>
      <!-- 内容：keep-alive 缓存各子页面状态（滚动位置、表单等） -->
      <div class="home__content">
        <router-view v-slot="{ Component, route }">
          <keep-alive :max="menuOptions.length">
            <component :is="Component" v-if="Component" :key="route.name" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { userApi } from '@/api'
  import { useUserStore } from '@/stores/user'
  import { connectWebSocket, disconnectWebSocket } from '@/utils/websocket'
  import {
    createEmotionWinodw,
    hideCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow
  } from '@/utils/window'
  import { useI18n } from 'vue-i18n'
  import { useRoute, useRouter } from 'vue-router'

  const userStore = useUserStore()

  const isMaximize = ref(false)
  const seletedMenuOption = ref('message')
  const { t } = useI18n()
  const router = useRouter()
  const route = useRoute()

  const menuOptions = computed(() => [
    {
      id: 'message',
      label: t('home.options.message'),
      icon: '#message',
      activeIcon: '#message-active',
      path: '/home/message'
    },
    {
      id: 'contacts',
      label: t('home.options.contacts'),
      icon: '#user',
      activeIcon: '#user-active',
      path: '/home/contacts'
    },
    {
      id: 'moment',
      label: t('home.options.moment'),
      icon: '#moment',
      activeIcon: '#moment-active',
      path: '/home/moment'
    },
    {
      id: 'ai',
      label: t('home.options.ai'),
      icon: '#ai',
      activeIcon: '#ai-active',
      path: '/home/ai'
    },
    {
      id: 'drive',
      label: t('home.options.drive'),
      icon: '#drive',
      activeIcon: '#drive-active',
      path: '/home/drive'
    },
    {
      id: 'application',
      label: t('home.options.application'),
      icon: '#application',
      activeIcon: '#application-active',
      path: '/home/application'
    }
  ])

  const moreOptions = computed(() => [
    {
      label: () => t('home.options.more.update'),
      key: 'update'
    },
    {
      label: () => t('home.options.more.feedback'),
      key: 'feedback'
    },
    {
      label: () => t('home.options.more.setting'),
      key: 'setting'
    },
    {
      label: () => t('home.options.more.about'),
      key: 'about'
    },
    {
      label: () => t('home.options.more.exit'),
      key: 'exit'
    }
  ])

  const syncMenuFromRoute = () => {
    const match = menuOptions.value.find((item) => item.path === route.path)
    if (match) {
      seletedMenuOption.value = match.id
    }
  }

  const onClickMenu = (item: { id: string; path: string }) => {
    if (seletedMenuOption.value === item.id && route.path === item.path) {
      return
    }
    seletedMenuOption.value = item.id
    router.push(item.path)
  }

  watch(() => route.path, syncMenuFromRoute, { immediate: true })

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
    onCurrentUserInfo()
  })

  onUnmounted(() => {
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
