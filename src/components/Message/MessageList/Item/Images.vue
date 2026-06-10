<template>
  <img class="message-image" :src="content.imgThumbUrl || content.imgUrl" :alt="content.imgName" @click="onPreview" />
</template>

<script setup lang="ts">
  import type { ImageContent } from '@/types/api/message'
  import { openImgViewer } from '@/utils/imgViewer'

  const props = defineProps<{
    content: ImageContent
  }>()

  const onPreview = () => {
    openImgViewer(
      [
        {
          url: props.content.imgUrl,
          name: props.content.imgName
        }
      ],
      0
    )
  }
</script>

<style scoped lang="scss">
  .message-image {
    display: block;
    height: 160px;
    width: auto;
    max-width: 320px;
    border-radius: 6px;
    cursor: pointer;
    object-fit: cover;
  }
</style>
