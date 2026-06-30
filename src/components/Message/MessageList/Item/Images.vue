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

  const displaySrc = ref('')
  const imageReady = ref(false)
  const imageError = ref(false)
  const cacheTriggered = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  let assetFallbackAttempted = false

  const imageLocalExt = computed(() => props.localExt)

  const showPlaceholder = computed(() => {
    if (!displaySrc.value) return true
    if (imageError.value) return true
    return !imageReady.value
  })

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const persistLocalPath = (localPath: string) => {
    void messageDbStore.updateImageMessageLocalExt(props.messageId, { localPath })
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
        persistLocalPath(localPath)
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
      cacheTriggered.value = false
    }
  )

  watch(
    () => [props.messageId, props.content.imgUrl, props.content.imgThumbUrl, props.localExt, uploading.value] as const,
    syncDisplaySrc,
    { immediate: true }
  )

  const onImageLoad = () => {
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
