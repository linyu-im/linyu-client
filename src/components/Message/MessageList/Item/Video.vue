<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="media">
    <div class="message-video-wrap" :style="wrapStyle" @click="onPreview">
      <div v-if="showPlaceholder" class="message-video__placeholder" aria-hidden="true" />
      <img
        v-if="useImageThumb && thumbSrc"
        class="message-video__cover"
        :src="thumbSrc"
        :alt="content.videoName"
        @load="onThumbLoad"
        @error="onThumbError" />
      <video
        v-else-if="videoSrc"
        ref="videoRef"
        class="message-video__cover"
        :src="videoSrc"
        preload="metadata"
        muted
        playsinline
        @loadedmetadata="onVideoMetadata"
        @loadeddata="seekToFirstFrame"
        @canplay="seekToFirstFrame"
        @seeked="freezeOnFirstFrame"
        @error="onVideoError" />
      <div v-if="coverReady" class="message-video__overlay">
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
    content: VideoContent
    localExt?: VideoMessageLocalExt
  }>()

  const appSettingsStore = useAppSettingsStore()
  const messageDbStore = useMessageDbStore()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)

  const IMAGE_THUMB_PATTERN = /\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/i

  const receivedLocalExt = ref<VideoMessageLocalExt>()
  const videoRef = ref<HTMLVideoElement | null>(null)
  const frameReady = ref(false)
  const coverReady = ref(false)
  const coverError = ref(false)
  const displayWidth = ref(DEFAULT_MEDIA_COVER_SIZE.displayWidth)
  const displayHeight = ref(DEFAULT_MEDIA_COVER_SIZE.displayHeight)
  const thumbSrc = ref('')
  const videoSrc = ref('')
  const cacheTriggered = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  let assetFallbackAttempted = false

  const videoLocalExt = computed(() => receivedLocalExt.value ?? props.localExt)

  const wrapStyle = computed(() => ({
    width: `${displayWidth.value}px`,
    height: `${displayHeight.value}px`
  }))

  const useImageThumb = computed(() => {
    const { videoThumbUrl, videoUrl } = props.content
    if (!videoThumbUrl) return false
    if (videoThumbUrl !== videoUrl) return true
    return /^data:image\//i.test(videoThumbUrl) || IMAGE_THUMB_PATTERN.test(videoThumbUrl)
  })

  const showPlaceholder = computed(() => coverError.value)

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const applyLayoutFromLocalExt = (localExt?: VideoMessageLocalExt) => {
    const size = getMediaDisplaySizeFromLocalExt(localExt)
    if (!size) return
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
  }

  const persistLocalExt = (patch: Partial<VideoMessageLocalExt>) => {
    const merged = mergeMediaMessageLocalExt(videoLocalExt.value, patch)
    receivedLocalExt.value = merged
    void messageDbStore.updateVideoMessageLocalExt(props.messageId, merged)
  }

  const persistDisplaySize = (naturalW: number, naturalH: number) => {
    const size = calcMediaCoverDisplaySize(naturalW, naturalH)
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
    if (hasSameDisplaySize(videoLocalExt.value, size)) return
    persistLocalExt(size)
  }

  const resetCoverState = () => {
    coverReady.value = false
    coverError.value = false
    frameReady.value = false
    if (!getMediaDisplaySizeFromLocalExt(videoLocalExt.value)) {
      displayWidth.value = DEFAULT_MEDIA_COVER_SIZE.displayWidth
      displayHeight.value = DEFAULT_MEDIA_COVER_SIZE.displayHeight
    }
  }

  const applyCoverLayout = (el: HTMLImageElement | HTMLVideoElement) => {
    const naturalW = 'naturalWidth' in el ? el.naturalWidth : el.videoWidth
    const naturalH = 'naturalHeight' in el ? el.naturalHeight : el.videoHeight
    persistDisplaySize(naturalW, naturalH)
  }

  const revealCover = () => {
    coverReady.value = true
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
        persistLocalExt({ localPath })
      })
      .catch(() => {
        cacheTriggered.value = false
      })
  }

  const applyThumbSrc = (nextSrc: string) => {
    if (thumbSrc.value === nextSrc) return
    resetCoverState()
    thumbSrc.value = nextSrc
  }

  const applyVideoSrc = (nextSrc: string, localPath = '') => {
    if (videoSrc.value === nextSrc) return
    resetCoverState()
    currentLocalPath.value = localPath
    assetFallbackAttempted = false
    if (!localPath) revokeBlobObjectUrl()
    videoSrc.value = nextSrc
    nextTick(() => videoRef.value?.load())
  }

  const syncMediaSrc = () => {
    const run = async () => {
      applyLayoutFromLocalExt(videoLocalExt.value)

      const localPath = videoLocalExt.value?.localPath
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
    const localPath = videoLocalExt.value?.localPath
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
    applyCoverLayout(event.target as HTMLImageElement)
    revealCover()
  }

  const onThumbError = () => {
    coverError.value = true
    coverReady.value = false
  }

  const onVideoMetadata = () => {
    const video = videoRef.value
    if (!video) return
    applyCoverLayout(video)
  }

  const onVideoError = () => {
    if (currentLocalPath.value && !assetFallbackAttempted) {
      assetFallbackAttempted = true
      readLocalFileAsObjectUrl(currentLocalPath.value)
        .then((url) => {
          revokeBlobObjectUrl()
          blobObjectUrl.value = url
          resetCoverState()
          videoSrc.value = url
          nextTick(() => videoRef.value?.load())
        })
        .catch(() => {
          coverError.value = true
          coverReady.value = false
        })
      return
    }
    coverError.value = true
    coverReady.value = false
  }

  const freezeOnFirstFrame = () => {
    const video = videoRef.value
    if (!video || frameReady.value) return
    video.pause()
    frameReady.value = true
    revealCover()
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
      receivedLocalExt.value = undefined
      cacheTriggered.value = false
      displayWidth.value = DEFAULT_MEDIA_COVER_SIZE.displayWidth
      displayHeight.value = DEFAULT_MEDIA_COVER_SIZE.displayHeight
      resetCoverState()
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
