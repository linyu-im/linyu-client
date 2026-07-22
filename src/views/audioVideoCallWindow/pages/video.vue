<template>
  <div class="video-call" data-tauri-drag-region>
    <header class="video-call__top" data-tauri-drag-region>
      <div class="video-call__meta">
        <div class="video-call__meta-count">
          <svg class="video-call__meta-user"><use href="#user"></use></svg>
          <span>{{ t('audioVideoCall.participantCount', { count: participantCount }) }}</span>
        </div>
        <div class="video-call__meta-duration">
          <span class="video-call__meta-dot" />
          <span class="video-call__meta-time">{{ durationTime }}</span>
        </div>
      </div>

      <div class="video-call__top-actions" @mousedown.stop>
        <SvgIconButton
          href="#minimize"
          color="var(--text-color)"
          hover-color="var(--text-color)"
          hover-bg="var(--icon-hover-color)"
          @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          color="var(--text-color)"
          hover-color="var(--text-color)"
          hover-bg="var(--icon-hover-color)"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton
          href="#close"
          color="var(--text-color)"
          hover-color="#fff"
          hover-bg="var(--red)"
          @click="closeCurrentWindow" />
      </div>
    </header>

    <div class="video-call__stage">
      <div class="video-call__main">
        <div class="video-call__main-feed">
          <div v-if="cameraOn" class="video-call__main-placeholder">
            <div class="video-call__main-avatar">
              {{ mainParticipant.name.slice(0, 1) }}
            </div>
          </div>
          <div v-else class="video-call__camera-off">
            <div class="video-call__camera-off-avatar">
              {{ mainParticipant.name.slice(0, 1) }}
            </div>
            <span>{{ t('audioVideoCall.cameraOffLabel') }}</span>
          </div>
          <div class="video-call__bottom-bar" @mousedown.stop>
            <span class="video-call__name-tag">{{ mainParticipant.name }}</span>
            <div class="video-call__controls">
              <n-tooltip placement="top" :show-arrow="false">
                <template #trigger>
                  <SvgIconButton
                    href="#user-plus"
                    :size="40"
                    :radius="10"
                    icon-size="20px"
                    color="var(--text-color)"
                    hover-color="var(--text-color)"
                    hover-bg="var(--icon-hover-color)" />
                </template>
                {{ t('audioVideoCall.inviteParticipant') }}
              </n-tooltip>

              <n-tooltip placement="top" :show-arrow="false">
                <template #trigger>
                  <div class="video-call__ctrl-wrap">
                    <SvgIconButton
                      :href="micOn ? '#microphone' : '#microphone-off'"
                      :size="40"
                      :radius="10"
                      icon-size="20px"
                      color="var(--text-color)"
                      hover-color="var(--text-color)"
                      hover-bg="var(--icon-hover-color)"
                      @click="toggleMic" />
                    <span v-if="micOn" class="video-call__ctrl-dot video-call__ctrl-dot--green" />
                    <span v-else class="video-call__ctrl-dot video-call__ctrl-dot--red" />
                  </div>
                </template>
                {{ micOn ? t('audioVideoCall.microphone') : t('audioVideoCall.microphoneOff') }}
              </n-tooltip>

              <n-tooltip placement="top" :show-arrow="false">
                <template #trigger>
                  <div class="video-call__ctrl-wrap">
                    <SvgIconButton
                      :href="cameraOn ? '#video' : '#video-off'"
                      :size="40"
                      :radius="10"
                      icon-size="20px"
                      color="var(--text-color)"
                      hover-color="var(--text-color)"
                      hover-bg="var(--icon-hover-color)"
                      @click="toggleCamera" />
                    <span v-if="cameraOn" class="video-call__ctrl-dot video-call__ctrl-dot--green" />
                    <span v-else class="video-call__ctrl-dot video-call__ctrl-dot--red" />
                  </div>
                </template>
                {{ cameraOn ? t('audioVideoCall.camera') : t('audioVideoCall.cameraOff') }}
              </n-tooltip>

              <n-tooltip placement="top" :show-arrow="false">
                <template #trigger>
                  <SvgIconButton
                    href="#hangup"
                    :size="40"
                    :radius="10"
                    icon-size="20px"
                    color="#fff"
                    hover-color="#fff"
                    bg="var(--red)"
                    hover-bg="color-mix(in srgb, var(--red) 88%, #000)"
                    @click="onHangup" />
                </template>
                {{ t('audioVideoCall.hangup') }}
              </n-tooltip>
            </div>
          </div>
        </div>
      </div>

      <aside class="video-call__sidebar">
        <n-scrollbar class="video-call__sidebar-scroll" :theme-overrides="{ width: '6px' }">
          <div class="video-call__sidebar-list">
            <div
              v-for="p in sideParticipants"
              :key="p.id"
              class="video-call__tile"
              :class="{ 'video-call__tile--off': !p.cameraOn }">
              <div v-if="p.cameraOn" class="video-call__tile-feed" />
              <div v-else class="video-call__tile-off">
                <div class="video-call__tile-avatar">
                  <svg><use href="#user"></use></svg>
                </div>
              </div>
              <span class="video-call__tile-name">{{ p.name }}</span>
            </div>
          </div>
        </n-scrollbar>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { closeCurrentWindow, minimizeCurrentWindow, restoreOrMaximizeCurrentWindow } from '@/utils/desktop/window'

  interface Participant {
    id: string
    name: string
    cameraOn: boolean
  }

  const { t } = useI18n()

  const micOn = ref(true)
  const cameraOn = ref(true)
  const isMaximized = ref(false)
  const callSeconds = ref(14 * 60 + 8)

  const mainParticipant = ref<Participant>({
    id: '1',
    name: 'Jerom',
    cameraOn: true
  })

  const sideParticipants = ref<Participant[]>([
    {
      id: '2',
      name: 'Alex',
      cameraOn: true
    },
    {
      id: '3',
      name: 'Sam',
      cameraOn: false
    },
    {
      id: '4',
      name: 'Taylor',
      cameraOn: true
    },
    {
      id: '5',
      name: 'Chris',
      cameraOn: true
    },
    {
      id: '6',
      name: 'Jordan',
      cameraOn: true
    }
  ])

  const participantCount = computed(() => 1 + sideParticipants.value.length)

  const durationTime = computed(() => {
    const h = Math.floor(callSeconds.value / 3600)
    const m = Math.floor((callSeconds.value % 3600) / 60)
    const s = callSeconds.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      callSeconds.value += 1
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  const toggleMic = () => {
    micOn.value = !micOn.value
  }

  const toggleCamera = () => {
    cameraOn.value = !cameraOn.value
  }

  const onHangup = () => {
    closeCurrentWindow()
  }
</script>

<style lang="scss" scoped>
  .video-call {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 12px 2px 12px 12px;
    box-sizing: border-box;
    color: var(--text-color);
    background: var(--bg-secondary-color);
    user-select: none;

    &__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      margin-bottom: 12px;
      z-index: 2;
    }

    &__meta {
      display: flex;
      align-items: center;
      height: 32px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(8px);
      box-sizing: border-box;
    }

    &__meta-count,
    &__meta-duration {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 100%;
      font-size: 13px;
      color: var(--text-color);
      box-sizing: border-box;
    }

    &__meta-count {
      width: 60px;
    }

    &__meta-duration {
      width: 96px;
      gap: 4px;
    }

    &__meta-time {
      width: 68px;
      flex-shrink: 0;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    &__meta-user {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--text-muted-color);
    }

    &__meta-dot {
      width: 8px;
      height: 8px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--red);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 25%, transparent);
    }

    &__top-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 12px;
    }

    &__stage {
      flex: 1;
      display: flex;
      gap: 12px;
      min-height: 0;
    }

    &__main {
      flex: 1;
      min-width: 0;
    }

    &__main-feed {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 16px;
      background: var(--bg-primary-color);
      border: 1px solid var(--border-color);
    }

    &__main-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: linear-gradient(145deg, rgba(var(--primary-rgb), 0.18), var(--bg-primary-color) 70%);
    }

    &__main-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      font-size: 48px;
      font-weight: 600;
      color: #fff;
      background: var(--primary-color);
      box-shadow: 0 12px 40px rgba(var(--primary-rgb), 0.28);
    }

    &__camera-off {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      height: 100%;
      color: var(--text-secondary-color);
      font-size: 14px;
      background: linear-gradient(145deg, rgba(var(--primary-rgb), 0.18), var(--bg-primary-color) 70%);
    }

    &__camera-off-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      font-size: 36px;
      font-weight: 600;
      color: #fff;
      background: var(--primary-soft-color);
    }

    &__name-tag {
      position: absolute;
      left: 14px;
      top: 50%;
      max-width: 140px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 13px;
      color: var(--text-color);
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(6px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transform: translateY(-50%);
      z-index: 1;
    }

    &__bottom-bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 44px;
      z-index: 2;
      pointer-events: none;

      > * {
        pointer-events: auto;
      }
    }

    &__sidebar {
      display: flex;
      flex-direction: column;
      width: 220px;
      flex-shrink: 0;
      min-height: 0;
    }

    &__sidebar-scroll {
      flex: 1;
      min-height: 0;
      height: 100%;

      :deep(.n-scrollbar-container) {
        height: 100%;
      }

      :deep(.n-scrollbar-content) {
        box-sizing: border-box;
      }

      :deep(.n-scrollbar-rail) {
        right: 0;
      }
    }

    &__sidebar-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-right: 10px;
      box-sizing: border-box;
    }

    &__tile {
      position: relative;
      flex-shrink: 0;
      width: 100%;
      aspect-ratio: 16 / 10;
      overflow: hidden;
      border-radius: 14px;
      background: var(--bg-primary-color);
      border: 1px solid var(--border-color);
    }

    &__tile-feed {
      width: 100%;
      height: 100%;
      background: linear-gradient(160deg, rgba(var(--primary-rgb), 0.22), var(--card-bg-color));
    }

    &__tile-off {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: linear-gradient(160deg, rgba(var(--primary-rgb), 0.22), var(--card-bg-color));
    }

    &__tile-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      color: #fff;
      background: var(--primary-soft-color);

      svg {
        width: 26px;
        height: 26px;
      }
    }

    &__tile-name {
      position: absolute;
      left: 8px;
      bottom: 8px;
      max-width: calc(100% - 16px);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-color);
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(6px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      z-index: 1;
    }

    &__controls {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 54px;
      padding: 0 20px 0 18px;
      border-radius: 12px;
      background: var(--toolbar-bg-color);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    &__ctrl-wrap {
      position: relative;
    }

    &__ctrl-dot {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: 2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      pointer-events: none;

      &--green {
        background: var(--green);
      }

      &--red {
        background: var(--red);
      }
    }
  }
</style>
