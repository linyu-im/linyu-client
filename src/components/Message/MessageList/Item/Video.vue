<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="media">
    <div class="message-video-wrap" :style="wrapStyle" @click="onPreview">
      <div v-if="showPlaceholder" class="message-video__placeholder" aria-hidden="true" />
      <img
        v-if="showThumbCover"
        class="message-video__cover"
        :src="thumbSrc"
        :alt="content.videoName"
        @load="onThumbLoad"
        @error="onThumbError" />
      <video
        v-if="videoSrc"
        v-show="!showThumbCover"
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
      <div v-if="coverRevealed" class="message-video__overlay">
        <div class="message-video__play" />
      </div>
    </div>
  </UploadProgress>
</template>

<script setup lang="ts">
  import { exists } from '@tauri-apps/plugin-fs'
  import type { VideoContent, VideoMessageLocalExt } from '@/types/api/message'
  import { openVideoViewer } from '@/utils/desktop/videoViewer'
  import {
    readLocalFileAsObjectUrl,
    resolveLocalMediaDisplayUrl,
    resolveLocalMediaFilePath,
    toLocalFileDisplayUrl
  } from '@/utils/file/blobFilePath'
  import { downloadMessageToStorage, resolveMessageStorageRoot } from '@/utils/message/messageFileSave'
  import { mergeMediaMessageLocalExt } from '@/utils/message/messageLocalExt'
  import {
    calcMediaCoverDisplaySize,
    DEFAULT_MEDIA_COVER_SIZE,
    getMediaDisplaySizeFromLocalExt,
    hasSameDisplaySize
  } from '@/utils/message/messageMediaLayout'
  import UploadProgress from '@/components/Message/UploadProgress.vue'
  import { useMessageUploadProgress } from '@/composables/useMessageUploadProgress'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { useMessageDbStore } from '@/stores/message/messageDb'

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
  const coverRevealed = ref(false)
  const coverError = ref(false)
  const displayWidth = ref(DEFAULT_MEDIA_COVER_SIZE.displayWidth)
  const displayHeight = ref(DEFAULT_MEDIA_COVER_SIZE.displayHeight)
  const thumbSrc = ref('')
  const videoSrc = ref('')
  const cacheTriggered = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  const hadLocalVideoContent = ref(false)
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

  const showThumbCover = computed(() => {
    if (!thumbSrc.value) return false
    if (useImageThumb.value) return true
    return Boolean(videoSrc.value && !frameReady.value)
  })

  const showPlaceholder = computed(() => coverError.value && !coverRevealed.value)

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const isReplacingAfterSend = () =>
    coverRevealed.value && hadLocalVideoContent.value && !isLocalPendingUrl(props.content.videoUrl)

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const applyLayoutFromLocalExt = (localExt?: VideoMessageLocalExt) => {
    const size = getMediaDisplaySizeFromLocalExt(localExt)
    if (!size) return
    if (coverRevealed.value && displayWidth.value === size.displayWidth && displayHeight.value === size.displayHeight) {
      return
    }
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
    const sizeUnchanged = displayWidth.value === size.displayWidth && displayHeight.value === size.displayHeight
    if (sizeUnchanged) {
      if (!hasSameDisplaySize(videoLocalExt.value, size)) persistLocalExt(size)
      return
    }
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
    if (hasSameDisplaySize(videoLocalExt.value, size)) return
    persistLocalExt(size)
  }

  const resetCoverState = () => {
    if (!coverRevealed.value) {
      coverError.value = false
      frameReady.value = false
      if (!getMediaDisplaySizeFromLocalExt(videoLocalExt.value)) {
        displayWidth.value = DEFAULT_MEDIA_COVER_SIZE.displayWidth
        displayHeight.value = DEFAULT_MEDIA_COVER_SIZE.displayHeight
      }
      return
    }
    coverError.value = false
    frameReady.value = false
  }

  const resetMediaState = () => {
    receivedLocalExt.value = undefined
    cacheTriggered.value = false
    thumbSrc.value = ''
    videoSrc.value = ''
    hadLocalVideoContent.value = false
    coverRevealed.value = false
    coverError.value = false
    frameReady.value = false
    displayWidth.value = DEFAULT_MEDIA_COVER_SIZE.displayWidth
    displayHeight.value = DEFAULT_MEDIA_COVER_SIZE.displayHeight
  }

  const applyCoverLayout = (el: HTMLImageElement | HTMLVideoElement) => {
    const naturalW = 'naturalWidth' in el ? el.naturalWidth : el.videoWidth
    const naturalH = 'naturalHeight' in el ? el.naturalHeight : el.videoHeight
    const size = calcMediaCoverDisplaySize(naturalW, naturalH)
    const sizeUnchanged = displayWidth.value === size.displayWidth && displayHeight.value === size.displayHeight
    if (!sizeUnchanged) {
      persistDisplaySize(naturalW, naturalH)
    } else if (!hasSameDisplaySize(videoLocalExt.value, size)) {
      persistLocalExt(size)
    }
  }

  const revealCover = () => {
    coverRevealed.value = true
    coverError.value = false
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
    if (!nextSrc || thumbSrc.value === nextSrc) return

    if (isReplacingAfterSend() && thumbSrc.value) return

    if (!coverRevealed.value || !thumbSrc.value) {
      resetCoverState()
      thumbSrc.value = nextSrc
      return
    }

    const image = new Image()
    image.onload = () => {
      thumbSrc.value = nextSrc
      coverError.value = false
    }
    image.onerror = () => {
      coverError.value = false
    }
    image.src = nextSrc
  }

  const applyVideoSrc = (nextSrc: string, localPath = '') => {
    if (videoSrc.value === nextSrc) {
      if (localPath) currentLocalPath.value = localPath
      return
    }

    const keepCoverVisible = isReplacingAfterSend() || coverRevealed.value

    if (!keepCoverVisible) {
      resetCoverState()
    } else {
      frameReady.value = false
    }

    coverError.value = false
    currentLocalPath.value = localPath
    assetFallbackAttempted = false
    if (!localPath) revokeBlobObjectUrl()
    videoSrc.value = nextSrc
    nextTick(() => videoRef.value?.load())
  }

  const syncMediaSrc = () => {
    const run = async () => {
      if (isLocalPendingUrl(props.content.videoUrl)) {
        hadLocalVideoContent.value = true
      }

      applyLayoutFromLocalExt(videoLocalExt.value)

      const localPath = videoLocalExt.value?.localPath
      const hasLocalVideo = !!(localPath && (await exists(localPath)))
      const resolvedThumb = props.content.videoThumbUrl ? resolveLocalMediaDisplayUrl(props.content.videoThumbUrl) : ''

      if (useImageThumb.value) {
        if (isReplacingAfterSend() && thumbSrc.value) {
          if (!cacheTriggered.value && props.content.videoUrl) {
            cacheTriggered.value = true
            void cacheRemoteVideo()
          }
          return
        }

        const thumbUrl =
          uploading.value || isLocalPendingUrl(props.content.videoUrl)
            ? resolvedThumb || props.content.videoThumbUrl
            : props.content.videoThumbUrl

        applyThumbSrc(thumbUrl)

        if (!hasLocalVideo && !cacheTriggered.value && props.content.videoUrl) {
          cacheTriggered.value = true
          void cacheRemoteVideo()
        }
        return
      }

      if (!thumbSrc.value && resolvedThumb) {
        thumbSrc.value = resolvedThumb
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
    if (uploading.value || !coverRevealed.value) return
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
    if (coverRevealed.value && thumbSrc.value) return
    coverError.value = true
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
          frameReady.value = false
          videoSrc.value = url
          nextTick(() => videoRef.value?.load())
        })
        .catch(() => {
          if (!coverRevealed.value) coverError.value = true
        })
      return
    }
    if (coverRevealed.value && thumbSrc.value) {
      coverError.value = false
      return
    }
    coverError.value = true
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
    () => `${props.content.videoUrl}|${props.content.videoThumbUrl}`,
    (identity, prevIdentity) => {
      if (prevIdentity === undefined) return

      const prevUrl = prevIdentity.split('|')[0] ?? ''
      const nextUrl = identity.split('|')[0] ?? ''
      const isSendSuccess = coverRevealed.value && isLocalPendingUrl(prevUrl) && !isLocalPendingUrl(nextUrl)

      if (isSendSuccess) {
        hadLocalVideoContent.value = true
        cacheTriggered.value = false
        return
      }
      resetMediaState()
    }
  )

  watch(
    () => props.messageId,
    (newId, oldId) => {
      if (!oldId || newId === oldId) return
      const ext = receivedLocalExt.value ?? props.localExt
      if (ext) {
        void messageDbStore.updateVideoMessageLocalExt(newId, ext)
      }
    }
  )

  watch(
    () => [props.content.videoUrl, props.content.videoThumbUrl, props.localExt, uploading.value] as const,
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
