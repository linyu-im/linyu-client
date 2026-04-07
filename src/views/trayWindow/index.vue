<template>
  <div class="tray">
    <div class="p-5px">
      <div class="tray__option" @click="onExitApp">退出Linyu</div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { exit } from '@tauri-apps/plugin-process'
  import { initSystemTray, setTrayEvent } from '@/utils/tray'
  initSystemTray()
  setTrayEvent()

  const onExitApp = () => {
    exit()
  }
</script>

<style scoped lang="scss">
  .tray {
    height: 100vh;
    width: 100vw;
    background-color: var(--primary-bg-color);
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
