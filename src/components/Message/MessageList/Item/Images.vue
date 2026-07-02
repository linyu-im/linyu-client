<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="media">
    <div class="message-image-wrap" :style="wrapStyle" @click="onPreview">
      <div v-if="showPlaceholder" class="message-image__placeholder" aria-hidden="true">
        <svg class="message-image__placeholder-icon">
          <use href="#image" />
        </svg>
      </div>
      <img v-if="displaySrc" class="message-image" :src="displaySrc" alt="" @load="onImageLoad" @error="onImageError" />
    </div>
  </UploadProgress>
</template>

<script setup lang="ts">
  import { exists } from '@tauri-apps/plugin-fs'
  import type { ImageContent, ImageMessageLocalExt } from '@/types/api/message'
  import { openImgViewer } from '@/utils/imgViewer'
  import {
    readLocalFileAsObjectUrl,
    resolveLocalMediaDisplayUrl,
    resolveLocalMediaFilePath,
    toLocalFileDisplayUrl
  } from '@/utils/blobFilePath'
  import { downloadMessageToStorage, resolveMessageStorageRoot } from '@/utils/messageFileSave'
  import { mergeMediaMessageLocalExt } from '@/utils/messageLocalExt'
  import {
    calcMediaCoverDisplaySize,
    DEFAULT_MEDIA_COVER_SIZE,
    getMediaDisplaySizeFromLocalExt,
    hasSameDisplaySize
  } from '@/utils/messageMediaLayout'
  import UploadProgress from '@/components/Message/UploadProgress.vue'
  import { useMessageUploadProgress } from '@/composables/useMessageUploadProgress'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import { useMessageDbStore } from '@/stores/messageDb'

  const props = defineProps<{
    messageId: string
    content: ImageContent
    localExt?: ImageMessageLocalExt
  }>()

  const appSettingsStore = useAppSettingsStore()
  const messageDbStore = useMessageDbStore()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)

  const receivedLocalExt = ref<ImageMessageLocalExt>()
  const displaySrc = ref('')
  const imageReady = ref(false)
  const imageError = ref(false)
  const cacheTriggered = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  const displayWidth = ref(DEFAULT_MEDIA_COVER_SIZE.displayWidth)
  const displayHeight = ref(DEFAULT_MEDIA_COVER_SIZE.displayHeight)
  let assetFallbackAttempted = false

  const imageLocalExt = computed(() => receivedLocalExt.value ?? props.localExt)

  const wrapStyle = computed(() => ({
    width: `${displayWidth.value}px`,
    height: `${displayHeight.value}px`
  }))

  const showPlaceholder = computed(() => imageError.value)

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const applyLayoutFromLocalExt = (localExt?: ImageMessageLocalExt) => {
    const size = getMediaDisplaySizeFromLocalExt(localExt)
    if (!size) return
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
  }

  const persistLocalExt = (patch: Partial<ImageMessageLocalExt>) => {
    const merged = mergeMediaMessageLocalExt(imageLocalExt.value, patch)
    receivedLocalExt.value = merged
    void messageDbStore.updateImageMessageLocalExt(props.messageId, merged)
  }

  const persistDisplaySize = (naturalW: number, naturalH: number) => {
    const size = calcMediaCoverDisplaySize(naturalW, naturalH)
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
    if (hasSameDisplaySize(imageLocalExt.value, size)) return
    persistLocalExt(size)
  }

  const cacheRemoteImage = () => {
    if (!props.content.imgUrl) return Promise.resolve()

    return resolveMessageStorageRoot(appSettingsStore.storage.path)
      .then((storageRoot) =>
        downloadMessageToStorage({
          storageRoot,
          sourceUrl: props.content.imgUrl,
          category: 'media',
          messageId: props.messageId,
          fileName: props.content.imgName
        })
      )
      .then((localPath) => {
        persistLocalExt({ localPath })
      })
      .catch(() => {
        cacheTriggered.value = false
      })
  }

  const applyDisplaySrc = (nextSrc: string, localPath = '') => {
    if (displaySrc.value === nextSrc) return
    imageReady.value = false
    imageError.value = false
    currentLocalPath.value = localPath
    assetFallbackAttempted = false
    if (!localPath) revokeBlobObjectUrl()
    displaySrc.value = nextSrc
  }

  const syncDisplaySrc = () => {
    const run = async () => {
      applyLayoutFromLocalExt(imageLocalExt.value)

      const localPath = imageLocalExt.value?.localPath
      if (localPath && (await exists(localPath))) {
        applyDisplaySrc(toLocalFileDisplayUrl(localPath), localPath)
        return
      }

      const remoteOrBlobUrl = props.content.imgThumbUrl || props.content.imgUrl
      if (uploading.value || isLocalPendingUrl(props.content.imgUrl)) {
        applyDisplaySrc(resolveLocalMediaDisplayUrl(remoteOrBlobUrl))
        return
      }

      applyDisplaySrc(remoteOrBlobUrl)

      if (!cacheTriggered.value && props.content.imgUrl) {
        cacheTriggered.value = true
        void cacheRemoteImage()
      }
    }

    void run()
  }

  watch(
    () => props.messageId,
    () => {
      receivedLocalExt.value = undefined
      cacheTriggered.value = false
      displayWidth.value = DEFAULT_MEDIA_COVER_SIZE.displayWidth
      displayHeight.value = DEFAULT_MEDIA_COVER_SIZE.displayHeight
    }
  )

  watch(
    () => [props.messageId, props.content.imgUrl, props.content.imgThumbUrl, props.localExt, uploading.value] as const,
    syncDisplaySrc,
    { immediate: true }
  )

  const onImageLoad = (event: Event) => {
    const image = event.target as HTMLImageElement
    persistDisplaySize(image.naturalWidth, image.naturalHeight)
    imageReady.value = true
    imageError.value = false
  }

  const onImageError = () => {
    if (currentLocalPath.value && !assetFallbackAttempted) {
      assetFallbackAttempted = true
      readLocalFileAsObjectUrl(currentLocalPath.value)
        .then((url) => {
          revokeBlobObjectUrl()
          blobObjectUrl.value = url
          imageReady.value = false
          displaySrc.value = url
        })
        .catch(() => {
          imageReady.value = false
          imageError.value = true
        })
      return
    }
    imageReady.value = false
    imageError.value = true
  }

  const resolvePreviewUrl = () => {
    if (blobObjectUrl.value) return blobObjectUrl.value
    const localPath = imageLocalExt.value?.localPath
    if (localPath) return toLocalFileDisplayUrl(localPath)
    return props.content.imgUrl
  }

  const onPreview = () => {
    if (uploading.value || !imageReady.value || imageError.value) return
    openImgViewer(
      [
        {
          url: resolvePreviewUrl(),
          name: props.content.imgName
        }
      ],
      0
    )
  }

  onBeforeUnmount(() => {
    revokeBlobObjectUrl()
  })
</script>

<style scoped lang="scss">
  .message-image-wrap {
    display: grid;
    max-width: 320px;
    line-height: 0;
    cursor: pointer;
    overflow: hidden;
    border-radius: 6px;

    > * {
      grid-area: 1 / 1;
    }
  }

  .message-image__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
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
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
