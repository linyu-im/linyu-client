<template>
  <img class="message-sticker" :src="content.stickerUrl" :alt="content.stickerName" draggable="false" />
</template>

<script setup lang="ts">
  import type { StickerContent } from '@/types/api/message'

  defineProps<{
    content: StickerContent
  }>()
</script>

<style scoped lang="scss">
  .message-sticker {
    display: block;
    width: 120px;
    height: 120px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }
</style>
