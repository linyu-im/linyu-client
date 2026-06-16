<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="media">
    <img class="message-image" :src="content.imgThumbUrl || content.imgUrl" :alt="content.imgName" @click="onPreview" />
  </UploadProgress>
</template>

<script setup lang="ts">
  import type { ImageContent } from '@/types/api/message'
  import { openImgViewer } from '@/utils/imgViewer'
  import UploadProgress from '@/components/Message/UploadProgress.vue'
  import { useMessageUploadProgress } from '@/composables/useMessageUploadProgress'

  const props = defineProps<{
    messageId: string
    content: ImageContent
  }>()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)

  const onPreview = () => {
    if (uploading.value) return
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
