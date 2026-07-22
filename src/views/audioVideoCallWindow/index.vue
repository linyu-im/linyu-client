<script setup lang="ts">
  import { ShowCurrentWindow } from '@/utils/desktop/window'

  onMounted(() => {
    ShowCurrentWindow()
  })
</script>

<template>
  <div class="call-window">
    <RouterView />
  </div>
</template>

<style lang="scss" scoped>
  .call-window {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-secondary-color);
  }
</style>
