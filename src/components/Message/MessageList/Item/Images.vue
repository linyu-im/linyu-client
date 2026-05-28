<template>
  <n-image
    class="message-image"
    :src="content.imgThumbUrl || content.imgUrl"
    :preview-src="content.imgUrl"
    :height="FIXED_IMAGE_HEIGHT"
    object-fit="cover"
    :img-props="{ alt: content.imgName }" />
</template>

<script setup lang="ts">
  import type { ImageContent } from '@/types/api/message'

  const FIXED_IMAGE_HEIGHT = 160

  defineProps<{
    content: ImageContent
  }>()
</script>

<style scoped lang="scss">
  .message-image {
    display: inline-block;
    max-width: 320px;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;

    :deep(img) {
      display: block;
      height: 160px;
      width: auto;
      max-width: 320px;
      border-radius: 6px;
    }
  }
</style>
