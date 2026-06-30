<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="media">
    <div class="message-video-wrap" :style="wrapStyle" @click="onPreview">
      <div v-if="!coverReady" class="message-video__placeholder" aria-hidden="true" />
      <img
        v-if="useImageThumb"
        class="message-video__cover"
        :class="{ 'message-video__cover--ready': coverReady }"
        :src="thumbSrc"
        :alt="content.videoName"
        @load="onThumbLoad"
        @error="onThumbError" />
      <video
        v-else
        ref="videoRef"
        class="message-video__cover"
        :class="{ 'message-video__cover--ready': coverReady }"
        :src="videoSrc"
        preload="metadata"
        muted
        playsinline
        @loadedmetadata="onVideoMetadata"
        @loadeddata="seekToFirstFrame"
        @canplay="seekToFirstFrame"
        @seeked="freezeOnFirstFrame"
        @error="onVideoError" />
      <div class="message-video__overlay">
        <div class="message-video__play" />
      </div>
    </div>
  </UploadProgress>
</template>

<script setup lang="ts">
  import { exists } from '@tauri-apps/plugin-fs'
  import type { VideoContent, VideoMessageLocalExt } from '@/types/api/message'
  import { openVideoViewer } from '@/utils/videoViewer'
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

  const COVER_HEIGHT = 160
  const COVER_MAX_WIDTH = 320
  const COVER_PLACEHOLDER_WIDTH = 48

  const props = defineProps<{
    messageId: string
    content: VideoContent
    localExt?: VideoMessageLocalExt
  }>()

  const appSettingsStore = useAppSettingsStore()
  const messageDbStore = useMessageDbStore()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)

  const IMAGE_THUMB_PATTERN = /\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/i

  const videoRef = ref<HTMLVideoElement | null>(null)
  const frameReady = ref(false)
  const coverReady = ref(false)
  const coverWidth = ref<number | null>(null)
  const thumbSrc = ref('')
  const videoSrc = ref('')
  const cacheTriggered = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  let assetFallbackAttempted = false

  const wrapStyle = computed(() => ({
    width: `${coverWidth.value ?? COVER_PLACEHOLDER_WIDTH}px`,
    height: `${COVER_HEIGHT}px`
  }))

  const useImageThumb = computed(() => {
    const { videoThumbUrl, videoUrl } = props.content
    if (!videoThumbUrl) return false
    if (videoThumbUrl !== videoUrl) return true
    return /^data:image\//i.test(videoThumbUrl) || IMAGE_THUMB_PATTERN.test(videoThumbUrl)
  })

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const resetCoverLayout = () => {
    coverReady.value = false
    coverWidth.value = null
    frameReady.value = false
  }

  const updateCoverLayout = (el: HTMLImageElement | HTMLVideoElement) => {
    const naturalW = 'naturalWidth' in el ? el.naturalWidth : el.videoWidth
    const naturalH = 'naturalHeight' in el ? el.naturalHeight : el.videoHeight
    if (naturalW > 0 && naturalH > 0) {
      coverWidth.value = Math.min(COVER_MAX_WIDTH, Math.round((naturalW / naturalH) * COVER_HEIGHT))
    }
    coverReady.value = true
  }

  const persistLocalPath = (localPath: string) => {
    void messageDbStore.updateVideoMessageLocalExt(props.messageId, { localPath })
  }

  const cacheRemoteVideo = () => {
    if (!props.content.videoUrl) return Promise.resolve()

    return resolveMessageStorageRoot(appSettingsStore.storage.path)
      .then((storageRoot) =>
        downloadMessageToStorage({
          storageRoot,
          sourceUrl: props.content.videoUrl,
          category: 'media',
          messageId: props.messageId,
          fileName: props.content.videoName,
          defaultExtension: '.mp4'
        })
      )
      .then((localPath) => {
        persistLocalPath(localPath)
      })
      .catch(() => {
        cacheTriggered.value = false
      })
  }

  const applyThumbSrc = (nextSrc: string) => {
    if (thumbSrc.value === nextSrc) return
    resetCoverLayout()
    thumbSrc.value = nextSrc
  }

  const applyVideoSrc = (nextSrc: string, localPath = '') => {
    if (videoSrc.value === nextSrc) return
    resetCoverLayout()
    currentLocalPath.value = localPath
    assetFallbackAttempted = false
    if (!localPath) revokeBlobObjectUrl()
    videoSrc.value = nextSrc
    nextTick(() => videoRef.value?.load())
  }

  const syncMediaSrc = () => {
    const run = async () => {
      const localPath = props.localExt?.localPath
      const hasLocalVideo = !!(localPath && (await exists(localPath)))

      if (useImageThumb.value) {
        const remoteThumb = props.content.videoThumbUrl
        if (uploading.value || isLocalPendingUrl(props.content.videoUrl)) {
          applyThumbSrc(resolveLocalMediaDisplayUrl(remoteThumb))
        } else {
          applyThumbSrc(remoteThumb)
        }

        if (!hasLocalVideo && !cacheTriggered.value && props.content.videoUrl) {
          cacheTriggered.value = true
          void cacheRemoteVideo()
        }
        return
      }

      if (hasLocalVideo) {
        applyVideoSrc(toLocalFileDisplayUrl(localPath), localPath)
        return
      }

      if (uploading.value || isLocalPendingUrl(props.content.videoUrl)) {
        applyVideoSrc(resolveLocalMediaDisplayUrl(props.content.videoUrl))
        return
      }

      applyVideoSrc(props.content.videoUrl)

      if (!cacheTriggered.value && props.content.videoUrl) {
        cacheTriggered.value = true
        void cacheRemoteVideo()
      }
    }

    void run()
  }

  const resolvePreviewUrl = () => {
    if (blobObjectUrl.value) return blobObjectUrl.value
    const localPath = props.localExt?.localPath
    if (localPath) return toLocalFileDisplayUrl(localPath)
    return props.content.videoUrl
  }

  const onPreview = () => {
    if (uploading.value || !coverReady.value) return
    openVideoViewer(
      [
        {
          url: resolvePreviewUrl(),
          name: props.content.videoName
        }
      ],
      0
    )
  }

  const onThumbLoad = (event: Event) => {
    updateCoverLayout(event.target as HTMLImageElement)
  }

  const onThumbError = () => {
    coverReady.value = true
  }

  const onVideoMetadata = () => {
    const video = videoRef.value
    if (!video) return
    updateCoverLayout(video)
  }

  const onVideoError = () => {
    if (currentLocalPath.value && !assetFallbackAttempted) {
      assetFallbackAttempted = true
      readLocalFileAsObjectUrl(currentLocalPath.value)
        .then((url) => {
          revokeBlobObjectUrl()
          blobObjectUrl.value = url
          resetCoverLayout()
          videoSrc.value = url
          nextTick(() => videoRef.value?.load())
        })
        .catch(() => {
          coverReady.value = true
        })
      return
    }
    coverReady.value = true
  }

  const freezeOnFirstFrame = () => {
    const video = videoRef.value
    if (!video || frameReady.value) return
    video.pause()
    frameReady.value = true
  }

  const seekToFirstFrame = () => {
    const video = videoRef.value
    if (!video || frameReady.value || useImageThumb.value) return

    const duration = Number.isFinite(video.duration) ? video.duration : 0
    const targetTime = duration > 0 ? Math.min(0.1, duration * 0.01) : 0

    if (Math.abs(video.currentTime - targetTime) < 0.001) {
      freezeOnFirstFrame()
      return
    }

    video.currentTime = targetTime
  }

  watch(
    () => props.messageId,
    () => {
      cacheTriggered.value = false
      resetCoverLayout()
    }
  )

  watch(
    () =>
      [
        props.messageId,
        props.content.videoUrl,
        props.content.videoThumbUrl,
        props.localExt,
        uploading.value,
        useImageThumb.value
      ] as const,
    syncMediaSrc,
    { immediate: true }
  )

  onBeforeUnmount(() => {
    revokeBlobObjectUrl()
  })
</script>

<style scoped lang="scss">
  .message-video-wrap {
    position: relative;
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

  .message-video__placeholder {
    width: 100%;
    height: 100%;
    background: var(--bg-secondary-color);
  }

  .message-video__cover {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    background: var(--bg-secondary-color);

    &:not(.message-video__cover--ready) {
      width: 0;
      height: 0;
      min-width: 0;
      min-height: 0;
    }

    &--ready {
      width: 100%;
      height: 100%;
      opacity: 1;
    }
  }

  .message-video__overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--text-color) 5%, transparent);
    pointer-events: none;
  }

  .message-video__play {
    width: 40px;
    height: 40px;
    background: color-mix(in srgb, var(--bg-primary-color) 95%, transparent);
    border-radius: 50%;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 55%;
      transform: translate(-50%, -50%);
      width: 0;
      height: 0;
      border-left: 12px solid var(--text-color);
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
    }
  }
</style>
