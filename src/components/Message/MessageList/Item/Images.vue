<template>
  <n-image
    class="message-image"
    :src="content.imgThumbUrl || content.imgUrl"
    :preview-src="content.imgUrl"
    object-fit="cover"
    :img-props="{ alt: content.imgName }" />
</template>

<script setup lang="ts">
  import type { ImageContent } from '@/types/api/message'

  defineProps<{
    content: ImageContent
  }>()
</script>

<style scoped lang="scss">
  .message-image {
    display: block;
    max-width: 240px;
    max-height: 240px;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;

    :deep(img) {
      display: block;
      max-width: 240px;
      max-height: 240px;
      border-radius: 6px;
    }
  }
</style>
