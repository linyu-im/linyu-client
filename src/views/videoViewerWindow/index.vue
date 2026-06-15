<template>
  <div class="video-viewer">
    <ToolBar class="video-viewer__toolbar" @maximized="(is) => (isMaximized = is)">
      <div class="flex-1" />
      <div class="flex">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="hideCurrentWindow" />
      </div>
    </ToolBar>

    <div v-if="currentVideo" class="video-viewer__body">
      <div class="video-viewer__stage" @click="togglePlay">
        <video
          ref="videoRef"
          class="video-viewer__video"
          :src="currentVideo.url"
          preload="auto"
          playsinline
          @loadedmetadata="onLoadedMetadata"
          @canplay="tryAutoPlay"
          @timeupdate="onTimeUpdate"
          @play="isPlaying = true"
          @pause="isPlaying = false"
          @ended="onEnded" />
      </div>

      <div class="video-viewer__bottom-bar">
        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <button type="button" class="video-viewer__control-btn" @click="togglePlay">
              <svg v-if="isPlaying" class="video-viewer__icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
              <svg v-else class="video-viewer__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
            </button>
          </template>
          {{ isPlaying ? t('videoViewer.pause') : t('videoViewer.play') }}
        </n-tooltip>

        <span class="video-viewer__time">{{ formatTime(currentTime) }}</span>

        <n-slider
          v-model:value="progress"
          class="video-viewer__slider"
          :min="0"
          :max="100"
          :step="0.1"
          :tooltip="false"
          @dragstart="isSeeking = true"
          @dragend="onSeekEnd"
          @update:value="onProgressUpdate" />

        <span class="video-viewer__time">{{ formatTime(duration) }}</span>

        <n-dropdown :options="speedOptions" trigger="click" placement="top" @select="onSpeedSelect">
          <button type="button" class="video-viewer__speed-btn">
            {{ playbackRate === 1 ? t('videoViewer.speed') : t('videoViewer.speedValue', { speed: playbackRate }) }}
          </button>
        </n-dropdown>

        <n-tooltip placement="top" :show-arrow="false">
          <template #trigger>
            <SvgIconButton
              href="#download"
              :size="36"
              icon-size="18px"
              color="#fff"
              hover-color="#fff"
              hover-bg="rgba(255, 255, 255, 0.12)"
              :disabled="saving"
              @click="onDownload" />
          </template>
          {{ t('videoViewer.download') }}
        </n-tooltip>
      </div>
    </div>

    <div v-else class="video-viewer__empty">
      <LinyuEmpty :description="t('videoViewer.empty')" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { save } from '@tauri-apps/plugin-dialog'
  import { writeFile } from '@tauri-apps/plugin-fs'
  import { useI18n } from 'vue-i18n'
  import { useVideoViewerStore } from '@/stores/videoViewer'
  import { hideCurrentWindow, minimizeCurrentWindow, restoreOrMaximizeCurrentWindow } from '@/utils/window'

  const { t } = useI18n()
  const videoViewerStore = useVideoViewerStore()
  const isMaximized = ref(false)

  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

  const videoRef = ref<HTMLVideoElement | null>(null)
  const isPlaying = ref(false)
  const isSeeking = ref(false)
  const saving = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const progress = ref(0)
  const playbackRate = ref(1)
  const autoPlayAttempted = ref(false)

  const currentVideo = computed(() => videoViewerStore.videos[videoViewerStore.currentIndex])

  const speedOptions = computed(() =>
    SPEED_OPTIONS.map((speed) => ({
      key: String(speed),
      label: () => t('videoViewer.speedValue', { speed })
    }))
  )

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
    const total = Math.floor(seconds)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const syncProgress = () => {
    const video = videoRef.value
    if (!video || !video.duration || isSeeking.value) return
    currentTime.value = video.currentTime
    progress.value = (video.currentTime / video.duration) * 100
  }

  const onTimeUpdate = () => {
    syncProgress()
  }

  const onLoadedMetadata = () => {
    const video = videoRef.value
    if (!video) return
    duration.value = Number.isFinite(video.duration) ? video.duration : 0
    video.playbackRate = playbackRate.value
    syncProgress()
  }

  const tryAutoPlay = () => {
    if (autoPlayAttempted.value) return
    autoPlayAttempted.value = true
    const video = videoRef.value
    if (!video) return
    video.play().catch(() => {
      isPlaying.value = false
    })
  }

  const togglePlay = () => {
    const video = videoRef.value
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {
        isPlaying.value = false
      })
      return
    }
    video.pause()
  }

  const onEnded = () => {
    isPlaying.value = false
    currentTime.value = duration.value
    progress.value = 100
  }

  const onProgressUpdate = (value: number) => {
    const video = videoRef.value
    if (!video || !video.duration) return
    isSeeking.value = true
    const nextTime = (value / 100) * video.duration
    video.currentTime = nextTime
    currentTime.value = nextTime
  }

  const onSeekEnd = () => {
    isSeeking.value = false
    syncProgress()
  }

  const onWindowMouseUp = () => {
    if (!isSeeking.value) return
    isSeeking.value = false
    syncProgress()
  }

  const onSpeedSelect = (key: string) => {
    const rate = Number(key)
    if (!Number.isFinite(rate)) return
    playbackRate.value = rate
    if (videoRef.value) {
      videoRef.value.playbackRate = rate
    }
  }

  const getDefaultFileName = (name: string, url: string) => {
    if (name) return name
    const urlPath = url.split('?')[0]
    const fileName = urlPath.split('/').pop()
    return fileName || 'video.mp4'
  }

  const onDownload = () => {
    const video = currentVideo.value
    if (!video || saving.value) return

    const defaultName = getDefaultFileName(video.name, video.url)

    save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'Video',
          extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']
        }
      ]
    }).then((filePath) => {
      if (!filePath) return

      saving.value = true
      fetch(video.url)
        .then((response) => response.arrayBuffer())
        .then((buffer) => writeFile(filePath, new Uint8Array(buffer)))
        .then(() => {
          window.$message.success(t('videoViewer.saveSuccess'))
        })
        .catch(() => {
          window.$message.error(t('videoViewer.saveFailed'))
        })
        .finally(() => {
          saving.value = false
        })
    })
  }

  const resetPlayback = () => {
    autoPlayAttempted.value = false
    isPlaying.value = false
    isSeeking.value = false
    currentTime.value = 0
    duration.value = 0
    progress.value = 0
    playbackRate.value = 1
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideCurrentWindow()
      return
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault()
      togglePlay()
    }
  }

  watch(
    () => currentVideo.value?.url,
    () => {
      resetPlayback()
      nextTick(() => {
        videoRef.value?.load()
      })
    },
    { immediate: true }
  )

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mouseup', onWindowMouseUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('mouseup', onWindowMouseUp)
    videoRef.value?.pause()
  })
</script>

<style scoped lang="scss">
  .video-viewer {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary-color);
    color: var(--text-color);
    overflow: hidden;
    user-select: none;

    &__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      height: 38px;
      padding: 0 3px;
    }

    &__body {
      position: relative;
      flex: 1;
      min-height: 0;
    }

    &__stage {
      height: 100%;
      padding: 5px 5px 62px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      cursor: pointer;
    }

    &__video {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      outline: none;
    }

    &__bottom-bar {
      position: absolute;
      left: 50%;
      bottom: 5px;
      transform: translateX(-50%);
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 10px;
      width: min(720px, calc(100% - 24px));
      padding: 8px 14px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
    }

    &__control-btn,
    &__speed-btn {
      border: none;
      background: transparent;
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      flex-shrink: 0;
    }

    &__control-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      transition: background-color 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
      }
    }

    &__icon {
      width: 18px;
      height: 18px;
    }

    &__time {
      min-width: 40px;
      font-size: 13px;
      color: #fff;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }

    &__slider {
      flex: 1;
      min-width: 120px;

      :deep(.n-slider-rail) {
        height: 4px;
        background: rgba(255, 255, 255, 0.25);
      }

      :deep(.n-slider-rail__fill) {
        background: #fff;
      }

      :deep(.n-slider-handle) {
        width: 12px;
        height: 12px;
        background: #fff;
        border: none;
        box-shadow: none;
      }
    }

    &__speed-btn {
      min-width: 44px;
      height: 28px;
      padding: 0 8px;
      border-radius: 6px;
      font-size: 13px;
      transition: background-color 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.12);
      }
    }

    &__empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
