<template>
  <div data-tauri-drag-region class="toolbar">
    <slot />
  </div>
</template>
<script setup lang="ts">
  import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
  const emit = defineEmits(['maximized'])

  let unlistenResized: () => void
  const resizeChange = async () => {
    const window = WebviewWindow.getCurrent()
    emit('maximized', await window.isMaximized())
  }
  onMounted(async () => {
    const window = WebviewWindow.getCurrent()
    unlistenResized = await window.onResized?.(() => {
      resizeChange()
    })
  })

  onUnmounted(() => {
    unlistenResized()
  })
</script>
<style scoped lang="scss">
  .toolbar {
    background-color: var(--toolbar-bg-color);
  }
</style>
