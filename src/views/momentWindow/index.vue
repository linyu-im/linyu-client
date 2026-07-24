<template>
  <div class="moment-window">
    <ToolBar class="moment-window__toolbar" @maximized="(is) => (isMaximized = is)">
      <div class="moment-window__drag" data-tauri-drag-region />
      <div class="moment-window__actions">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="closeCurrentWindow" />
      </div>
    </ToolBar>

    <div class="moment-window__body">
      <div class="moment-window__content">
        <MomentFeed v-if="userId" :cover-user-id="userId" :view-user-id="userId" @settings="onSettings" />
        <div v-else class="moment-window__empty">
          <LinyuEmpty />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useRoute } from 'vue-router'
  import MomentFeed from '@/components/Moment/MomentFeed.vue'
  import {
    closeCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const route = useRoute()

  const isMaximized = ref(false)

  const userId = computed(() => {
    const raw = route.query.userId
    return typeof raw === 'string' ? raw : ''
  })

  const onSettings = () => {
    window.$message.info(t('moment.cover.todo'))
  }

  onMounted(() => {
    ShowCurrentWindow()
  })
</script>

<style scoped lang="scss">
  .moment-window {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    color: var(--text-color);
    background-color: var(--bg-secondary-color);

    &__toolbar {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      height: 36px;
      padding: 0 4px 0 12px;
      box-sizing: border-box;
    }

    &__drag {
      flex: 1;
      height: 100%;
      min-width: 0;
    }

    &__actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    &__body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      justify-content: center;
    }

    &__content {
      --moment-edge: clamp(8px, 2vw, 12px);
      --moment-scrollbar: 6px;
      --moment-scroll-gap: 12px;
      position: relative;
      display: flex;
      width: 100%;
      max-width: min(780px, 100%);
      height: 100%;
      padding: 0 var(--moment-edge) 0 calc(var(--moment-edge) + var(--moment-scrollbar) + var(--moment-scroll-gap));
      box-sizing: border-box;
    }

    &__empty {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
  }
</style>
