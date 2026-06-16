<template>
  <div class="upload-progress" :class="`upload-progress--${variant}`">
    <slot />
    <div v-if="show" class="upload-progress__mask">
      <template v-if="variant === 'file'">
        <div class="upload-progress__file-track">
          <div class="upload-progress__file-fill" :style="{ width: `${progress}%` }" />
        </div>
      </template>
      <template v-else>
        <div class="upload-progress__media">
          <div
            class="upload-progress__media-ring"
            role="progressbar"
            :aria-valuenow="progress"
            aria-valuemin="0"
            aria-valuemax="100">
            <svg class="upload-progress__media-svg" viewBox="0 0 48 48" aria-hidden="true">
              <circle class="upload-progress__media-track" cx="24" cy="24" :r="RING_RADIUS" />
              <g class="upload-progress__media-loading-wrap">
                <circle
                  class="upload-progress__media-loading"
                  cx="24"
                  cy="24"
                  :r="RING_RADIUS"
                  :stroke-dasharray="LOADING_DASH" />
              </g>
              <circle
                class="upload-progress__media-fill"
                cx="24"
                cy="24"
                :r="RING_RADIUS"
                :stroke-dasharray="RING_CIRCUMFERENCE"
                :stroke-dashoffset="ringOffset" />
            </svg>
            <span class="upload-progress__media-text">{{ progress }}%</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      uploading?: boolean
      progress?: number
      variant?: 'media' | 'file'
    }>(),
    {
      uploading: false,
      progress: 0,
      variant: 'media'
    }
  )

  const show = computed(() => props.uploading && props.progress < 100)

  const RING_RADIUS = 20
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
  const LOADING_DASH = `${RING_CIRCUMFERENCE * 0.22} ${RING_CIRCUMFERENCE * 0.78}`

  const ringOffset = computed(() => RING_CIRCUMFERENCE * (1 - props.progress / 100))
</script>

<style scoped lang="scss">
  .upload-progress {
    position: relative;
    max-width: 100%;

    &--media {
      display: grid;
      width: max-content;
      max-width: 100%;

      > * {
        grid-area: 1 / 1;
      }
    }

    &--file {
      display: block;
      width: 100%;
      border-radius: inherit;
    }

    &__mask {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      pointer-events: none;
      z-index: 1;
    }

    &--media &__mask {
      position: relative;
      align-self: stretch;
      justify-self: stretch;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      background: color-mix(in srgb, var(--bg-secondary-color) 72%, transparent);
      border-radius: 6px;
    }

    &--file &__mask {
      inset: auto 0 0;
      height: 3px;
      align-items: stretch;
      justify-content: stretch;
      padding: 0;
      background: transparent;
      border-radius: 0 0 8px 8px;
      overflow: hidden;
    }

    &__file-track {
      width: 100%;
      height: 100%;
      background: color-mix(in srgb, var(--primary-color) 12%, var(--border-color));
    }

    &__file-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 0 0 0 2px;
      transition: width 0.15s ease;
    }

    &__media {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    &__media-ring {
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &__media-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    &__media-track {
      fill: none;
      stroke: var(--border-color);
      stroke-width: 2.5;
    }

    &__media-loading-wrap {
      transform-origin: 24px 24px;
      animation: upload-progress-spin 1.1s linear infinite;
    }

    &__media-loading {
      fill: none;
      stroke: color-mix(in srgb, var(--primary-color) 35%, transparent);
      stroke-width: 2.5;
      stroke-linecap: round;
    }

    &__media-fill {
      fill: none;
      stroke: var(--primary-color);
      stroke-width: 2.5;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.2s ease;
    }

    &__media-text {
      position: relative;
      z-index: 1;
      font-size: 11px;
      font-weight: 700;
      color: var(--primary-color);
      line-height: 1;
      letter-spacing: 0.02em;
      font-variant-numeric: tabular-nums;
    }
  }

  @keyframes upload-progress-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }
</style>
