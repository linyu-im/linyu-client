<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="media">
    <div class="message-image-wrap" @click="onPreview">
      <div v-if="showPlaceholder" class="message-image__placeholder" aria-hidden="true">
        <svg class="message-image__placeholder-icon">
          <use href="#image" />
        </svg>
      </div>
      <img
        v-if="displaySrc"
        class="message-image"
        :class="{ 'message-image--hidden': !imageReady }"
        :src="displaySrc"
        alt=""
        @load="onImageLoad"
        @error="onImageError" />
    </div>
  </UploadProgress>
</template>

<script setup lang="ts">
  import type { ImageContent } from '@/types/api/message'
  import { openImgViewer } from '@/utils/imgViewer'
  import { resolveLocalMediaDisplayUrl } from '@/utils/blobFilePath'
  import UploadProgress from '@/components/Message/UploadProgress.vue'
  import { useMessageUploadProgress } from '@/composables/useMessageUploadProgress'

  const props = defineProps<{
    messageId: string
    content: ImageContent
  }>()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)

  const imageReady = ref(false)
  const imageError = ref(false)

  const displaySrc = computed(() => resolveLocalMediaDisplayUrl(props.content.imgThumbUrl || props.content.imgUrl))

  const showPlaceholder = computed(() => {
    if (!displaySrc.value) return true
    if (imageError.value) return true
    return !imageReady.value
  })

  watch(displaySrc, () => {
    imageReady.value = false
    imageError.value = false
  })

  const onImageLoad = () => {
    imageReady.value = true
    imageError.value = false
  }

  const onImageError = () => {
    imageReady.value = false
    imageError.value = true
  }

  const onPreview = () => {
    if (uploading.value || !imageReady.value || imageError.value) return
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
  .message-image-wrap {
    display: grid;
    width: max-content;
    max-width: 320px;
    line-height: 0;

    > * {
      grid-area: 1 / 1;
    }
  }

  .message-image__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 160px;
    border-radius: 6px;
    background: var(--bg-secondary-color);
  }

  .message-image__placeholder-icon {
    width: 40px;
    height: 40px;
    color: var(--text-secondary-color);
    opacity: 0.45;
  }

  .message-image {
    display: block;
    height: 160px;
    width: auto;
    max-width: 320px;
    border-radius: 6px;
    cursor: pointer;
    object-fit: cover;
    background: var(--bg-secondary-color);

    &--hidden {
      opacity: 0;
    }
  }
</style>
