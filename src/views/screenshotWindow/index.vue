<template>
  <ScreenshotEditor :key="editorKey" @close="onEditorClose" />
</template>

<script setup lang="ts">
  import ScreenshotEditor from '@/components/Screenshot/ScreenshotEditor.vue'
  import { hideCurrentWindow } from '@/utils/desktop/window'

  const editorKey = ref(0)

  const resetEditor = () => {
    editorKey.value += 1
  }

  const onEditorClose = async () => {
    await hideCurrentWindow()
    resetEditor()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      void onEditorClose()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
</script>

<style scoped></style>
