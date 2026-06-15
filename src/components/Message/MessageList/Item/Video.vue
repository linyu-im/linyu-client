<template>
  <div class="message-video" @click="onPreview">
    <img v-if="useImageThumb" class="message-video__cover" :src="content.videoThumbUrl" :alt="content.videoName" />
    <video
      v-else
      ref="videoRef"
      class="message-video__cover"
      :src="content.videoUrl"
      preload="auto"
      muted
      playsinline
      @loadeddata="seekToFirstFrame"
      @canplay="seekToFirstFrame"
      @seeked="freezeOnFirstFrame" />
    <div class="message-video__overlay">
      <div class="message-video__play" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { VideoContent } from '@/types/api/message'
  import { openVideoViewer } from '@/utils/videoViewer'

  const props = defineProps<{
    content: VideoContent
  }>()

  const onPreview = () => {
    openVideoViewer(
      [
        {
          url: props.content.videoUrl,
          name: props.content.videoName
        }
      ],
      0
    )
  }

  const IMAGE_THUMB_PATTERN = /\.(jpe?g|png|gif|webp|bmp|avif)(\?|#|$)/i

  const videoRef = ref<HTMLVideoElement | null>(null)
  const frameReady = ref(false)

  const useImageThumb = computed(() => {
    const { videoThumbUrl, videoUrl } = props.content
    if (!videoThumbUrl) return false
    if (videoThumbUrl !== videoUrl) return true
    return /^data:image\//i.test(videoThumbUrl) || IMAGE_THUMB_PATTERN.test(videoThumbUrl)
  })

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
    () => [props.content.videoUrl, props.content.videoThumbUrl],
    () => {
      frameReady.value = false
      if (!useImageThumb.value) {
        nextTick(() => videoRef.value?.load())
      }
    }
  )
</script>

<style scoped lang="scss">
  .message-video {
    position: relative;
    display: inline-block;
    line-height: 0;
    cursor: pointer;

    &__cover {
      display: block;
      height: 160px;
      width: auto;
      max-width: 320px;
      border-radius: 6px;
      object-fit: cover;
      background: var(--bg-secondary-color);
    }

    &__overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--text-color) 5%, transparent);
      pointer-events: none;
      border-radius: 6px;
    }

    &__play {
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
  }
</style>
