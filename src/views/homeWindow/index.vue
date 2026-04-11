<template>
  <div class="home">
    <!-- 顶部 -->
    <ToolBar class="home__header" @maximized="(is) => (isMaximize = is)">
      <div class="w-50px flex items-center justify-center select-none">
        <!-- <svg class="size-18px pointer-events-none">
          <use href="#linyu2" />
        </svg> -->
        <div class="text-12px font-900 m-l-2px">Linyu</div>
      </div>
      <div class="flex">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximize ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximize = !v))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="hideCurrentWindow" />
      </div>
    </ToolBar>
    <!-- 主体 -->
    <div class="home__layout">
      <!-- 左侧 -->
      <ToolBar class="home__sider" @maximized="(is) => (isMaximize = is)">
        <div class="flex flex-col gap-8px">
          <SvgIconButton
            v-for="item in menuOptions"
            :key="item.id"
            :size="34"
            :radius="5"
            :href="seletedMenuOption === item.id ? item.activeIcon : item.icon"
            :active="item.id === seletedMenuOption"
            icon-size="22px"
            @click="() => (seletedMenuOption = item.id)" />
        </div>
      </ToolBar>
      <!-- 内容 -->
      <div class="home__content"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { hideCurrentWindow, minimizeCurrentWindow, restoreOrMaximizeCurrentWindow } from '@/utils/window'

  const isMaximize = ref(false)
  const seletedMenuOption = ref('message')

  let menuOptions = [
    {
      id: 'message',
      label: '消息',
      icon: '#message',
      activeIcon: '#message-active'
    },
    {
      id: 'user',
      label: '用户',
      icon: '#user',
      activeIcon: '#user-active'
    },
    {
      id: 'moment',
      label: '过往',
      icon: '#moment',
      activeIcon: '#moment-active'
    },
    {
      id: 'drive',
      label: '网盘',
      icon: '#drive',
      activeIcon: '#drive-active'
    },
    {
      id: 'ai',
      label: 'AI',
      icon: '#ai',
      activeIcon: '#ai-active'
    },
    {
      id: 'application ',
      label: '应用',
      icon: '#application',
      activeIcon: '#application-active'
    }
  ]

  onMounted(() => {})
</script>

<style scoped lang="scss">
  .home {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
    background-color: transparent;

    .home__header {
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 3px 0 0;
    }

    .home__layout {
      flex: 1;
      display: flex;
      height: 100%;
      background-color: var(--toolbar-bg-color);

      .home__sider {
        width: 50px;
        background-color: transparent;
        display: flex;
        justify-content: center;
        padding: 5px 0;

        .home__sider-btn {
          height: 34px;
          width: 34px;
          text-align: center;
          background-color: aqua;
          border-radius: 5px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }

      .home__content {
        flex: 1;
        background-color: var(--bg-secondary-color);
        border-radius: 5px 0 0 0;
      }
    }
  }
</style>
