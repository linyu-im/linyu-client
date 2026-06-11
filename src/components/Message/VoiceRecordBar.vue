<template>
  <div class="voice-record-bar">
    <button
      type="button"
      class="voice-record-bar__cancel"
      :aria-label="t('message.voiceRecord.cancel')"
      @click="emit('cancel')">
      <svg class="voice-record-bar__cancel-icon">
        <use href="#close" />
      </svg>
    </button>
    <div
      class="voice-record-bar__main"
      :class="{ 'voice-record-bar__main--hovered': isMainHovered && !sending }"
      @mouseenter="isMainHovered = true"
      @mouseleave="isMainHovered = false">
      <div class="voice-record-bar__wave" aria-hidden="true">
        <span class="voice-record-bar__duration" :class="{ 'voice-record-bar__duration--warn': isNearLimit }">
          {{ durationLabel }}
        </span>
        <span
          v-for="index in dotCount"
          :key="index"
          class="voice-record-bar__dot"
          :style="{ animationDelay: `${(index - 1) * 0.12}s` }" />
      </div>
      <button
        type="button"
        class="voice-record-bar__send"
        :class="{ 'voice-record-bar__send--expanded': isMainHovered && !sending }"
        :aria-label="t('message.voiceRecord.sendVoice')"
        :disabled="sending"
        @click="emit('send')">
        <n-spin v-if="sending" :size="14" />
        <template v-else>
          <svg class="voice-record-bar__send-icon">
            <use href="#arrow-up" />
          </svg>
          <span class="voice-record-bar__send-label">
            <span class="voice-record-bar__send-dots">····</span>
            <span>{{ t('message.voiceRecord.sendVoice') }}</span>
            <span class="voice-record-bar__send-dots">····</span>
          </span>
        </template>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const dotCount = 8

  const props = withDefaults(
    defineProps<{
      duration?: number
      maxDuration?: number
      warnRemaining?: number
      sending?: boolean
    }>(),
    {
      duration: 0,
      maxDuration: 60,
      warnRemaining: 10,
      sending: false
    }
  )

  const remainingSec = computed(() => Math.max(0, props.maxDuration - props.duration))
  const isNearLimit = computed(
    () => props.duration > 0 && remainingSec.value > 0 && remainingSec.value <= props.warnRemaining
  )
  const durationLabel = computed(() =>
    isNearLimit.value ? t('message.voiceRecord.remaining', { remaining: remainingSec.value }) : `${props.duration}"`
  )

  const emit = defineEmits<{
    cancel: []
    send: []
  }>()

  const isMainHovered = ref(false)
</script>

<style scoped lang="scss">
  .voice-record-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    &__cancel {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: var(--button-soft-bg);
      color: var(--text-secondary-color);
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: var(--card-bg-color);
      }
    }

    &__cancel-icon {
      width: 12px;
      height: 12px;
    }

    &__main {
      position: relative;
      flex: 1;
      min-width: 0;
      height: 26px;
      padding: 0 3px 0 12px;
      border-radius: 999px;
      background: var(--button-soft-bg);
      overflow: hidden;
    }

    &__wave {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 100%;
      padding-right: 30px;
      transition:
        opacity 0.32s ease,
        transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);

      .voice-record-bar__main--hovered & {
        opacity: 0;
        transform: scale(0.96);
        pointer-events: none;
      }
    }

    &__duration {
      flex-shrink: 0;
      min-width: 18px;
      font-size: 12px;
      color: var(--primary-color);
      font-variant-numeric: tabular-nums;

      &--warn {
        font-weight: 600;
      }
    }

    &__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--primary-color);
      animation: voice-record-dot 1.2s ease-in-out infinite;
    }

    &__send {
      position: absolute;
      top: 0;
      right: 3px;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: var(--primary-color);
      color: #fff;
      cursor: pointer;
      overflow: hidden;
      transition:
        width 0.48s cubic-bezier(0.22, 1, 0.36, 1),
        border-radius 0.42s cubic-bezier(0.22, 1, 0.36, 1),
        filter 0.2s ease;

      &--expanded {
        width: calc(100% - 3px);
        border-radius: 999px;
      }

      &:hover:not(:disabled) {
        filter: brightness(1.05);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.7;
      }
    }

    &__send-icon {
      position: absolute;
      width: 12px;
      height: 12px;
      flex-shrink: 0;
      transition:
        opacity 0.24s ease,
        transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);

      .voice-record-bar__send--expanded & {
        opacity: 0;
        transform: scale(0.5);
      }
    }

    &__send-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      user-select: none;
      opacity: 0;
      transform: scale(0.88);
      transition:
        opacity 0.32s ease 0.15s,
        transform 0.42s cubic-bezier(0.22, 1, 0.36, 1) 0.12s;

      .voice-record-bar__send--expanded & {
        opacity: 1;
        transform: scale(1);
      }
    }

    &__send-dots {
      letter-spacing: 1px;
      opacity: 0.85;
    }
  }

  @keyframes voice-record-dot {
    0%,
    100% {
      opacity: 0.35;
      transform: scale(0.85);
    }

    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
