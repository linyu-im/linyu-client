<template>
  <div class="audio-call" data-tauri-drag-region>
    <header class="audio-call__top" data-tauri-drag-region>
      <div class="audio-call__top-actions" @mousedown.stop>
        <SvgIconButton
          href="#minimize"
          color="var(--text-color)"
          hover-color="var(--text-color)"
          hover-bg="var(--icon-hover-color)"
          @click="minimizeCurrentWindow" />
        <SvgIconButton
          href="#close"
          color="var(--text-color)"
          hover-color="#fff"
          hover-bg="var(--red)"
          @click="closeCurrentWindow" />
      </div>
    </header>

    <div class="audio-call__body">
      <div class="audio-call__remote">
        <div class="audio-call__remote-halo">
          <div class="audio-call__avatar audio-call__avatar--lg">
            {{ remoteName.slice(0, 1) }}
          </div>
        </div>
        <div class="audio-call__name">{{ remoteName }}</div>
        <div class="audio-call__timer">
          <svg class="audio-call__timer-icon"><use href="#voice"></use></svg>
          <span class="audio-call__timer-text">{{ durationTime }}</span>
        </div>
      </div>
    </div>

    <div class="audio-call__footer" @mousedown.stop>
      <div class="audio-call__action">
        <div class="audio-call__action-wrap">
          <SvgIconButton
            :href="micOn ? '#microphone' : '#microphone-off'"
            :size="48"
            :radius="14"
            icon-size="22px"
            color="var(--text-color)"
            hover-color="var(--text-color)"
            bg="var(--card-bg-color)"
            hover-bg="var(--button-soft-bg)"
            @click="toggleMic" />
          <span v-if="micOn" class="audio-call__action-dot audio-call__action-dot--green" />
          <span v-else class="audio-call__action-dot audio-call__action-dot--red" />
        </div>
        <span class="audio-call__action-label audio-call__action-label--mic">
          {{ micOn ? t('audioVideoCall.mute') : t('audioVideoCall.unmute') }}
        </span>
      </div>

      <div class="audio-call__action">
        <SvgIconButton
          href="#hangup"
          :size="48"
          :radius="14"
          icon-size="22px"
          color="#fff"
          hover-color="#fff"
          bg="var(--red)"
          hover-bg="color-mix(in srgb, var(--red) 88%, #000)"
          @click="onHangup" />
        <span class="audio-call__action-label">{{ t('audioVideoCall.hangup') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { closeCurrentWindow, minimizeCurrentWindow } from '@/utils/desktop/window'

  const { t } = useI18n()

  const micOn = ref(true)
  const callSeconds = ref(3 * 60 + 24)

  const remoteName = ref('Jerom')

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

  const onHangup = () => {
    closeCurrentWindow()
  }
</script>

<style lang="scss" scoped>
  .audio-call {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 12px 12px 28px;
    box-sizing: border-box;
    color: var(--text-color);
    background:
      radial-gradient(ellipse 80% 55% at 50% 0%, rgba(var(--primary-rgb), 0.06), transparent 70%),
      var(--bg-secondary-color);
    user-select: none;

    &__top {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
      min-height: 32px;
      z-index: 2;
    }

    &__timer {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 32px;
      margin-top: 10px;
      padding: 0 14px;
      border-radius: 999px;
      background: var(--toolbar-bg-color);
      backdrop-filter: blur(8px);
      box-sizing: border-box;
    }

    &__timer-icon {
      width: 14px;
      height: 14px;
      color: var(--green);
      flex-shrink: 0;
    }

    &__timer-text {
      width: 68px;
      text-align: center;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
      color: var(--text-color);
    }

    &__top-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 0;
    }

    &__remote {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    &__remote-halo {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;

      &::before {
        content: '';
        position: absolute;
        width: 168px;
        height: 168px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(var(--primary-rgb), 0.35) 0%,
          rgba(var(--primary-rgb), 0.08) 55%,
          transparent 72%
        );
        pointer-events: none;
      }
    }

    &__avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 600;
      color: #fff;
      background: var(--primary-color);
      position: relative;
      z-index: 1;

      &--lg {
        width: 120px;
        height: 120px;
        font-size: 48px;
        box-shadow: 0 12px 40px rgba(var(--primary-rgb), 0.28);
      }
    }

    &__name {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.3;
    }

    &__footer {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 56px;
      flex-shrink: 0;
      padding-top: 8px;
    }

    &__action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    &__action-wrap {
      position: relative;
    }

    &__action-dot {
      position: absolute;
      left: 50%;
      bottom: 4px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      transform: translateX(-50%);
      pointer-events: none;

      &--green {
        background: var(--green);
      }

      &--red {
        background: var(--red);
      }
    }

    &__action-label {
      font-size: 13px;
      color: var(--text-secondary-color);
      text-align: center;
      white-space: nowrap;

      &--mic {
        width: 56px;
      }
    }
  }
</style>
