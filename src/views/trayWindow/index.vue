<template>
  <div class="tray">
    <div class="p-5px">
      <div class="tray__option" @click="onExitApp">{{ t('tray.exit') }}</div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { initSystemTray, setTrayEvent } from '@/utils/tray'
  import { useI18n } from 'vue-i18n'
  import { exitApp } from '@/utils/window'

  const { t } = useI18n()
  initSystemTray()
  setTrayEvent()

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
