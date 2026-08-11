<template>
  <div class="screenshot-stroke-options" :style="{ marginLeft: `${anchorLeft}px` }" @pointerdown.stop @mousedown.stop>
    <div class="screenshot-stroke-options__arrow" />
    <div class="screenshot-stroke-options__body">
      <label class="screenshot-stroke-options__field">
        <span class="screenshot-stroke-options__label">{{ t('screenshot.strokeWidth') }}</span>
        <n-slider
          v-model:value="strokeWidthModel"
          class="screenshot-stroke-options__slider"
          :min="1"
          :max="12"
          :step="1"
          :tooltip="false" />
        <span class="screenshot-stroke-options__value">{{ strokeWidth }}</span>
      </label>

      <span class="screenshot-stroke-options__divider" />

      <n-popover trigger="click" placement="bottom" :show-arrow="false" :z-index="100">
        <template #trigger>
          <button type="button" class="screenshot-stroke-options__color-trigger" :title="t('screenshot.strokeColor')">
            <span class="screenshot-stroke-options__color-swatch" :style="{ backgroundColor: strokeColor }" />
            <svg class="screenshot-stroke-options__chevron">
              <use href="#chevron-down" />
            </svg>
          </button>
        </template>
        <div class="screenshot-stroke-options__palette">
          <button
            v-for="color in presetColors"
            :key="color"
            type="button"
            class="screenshot-stroke-options__palette-item"
            :class="{ 'screenshot-stroke-options__palette-item--active': strokeColor === color }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="strokeColorModel = color" />
        </div>
      </n-popover>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { SCREENSHOT_PRESET_COLORS } from '@/constants/screenshot'

  interface Props {
    strokeWidth: number
    strokeColor: string
    anchorLeft?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    anchorLeft: 34
  })

  const emit = defineEmits<{
    'update:strokeWidth': [value: number]
    'update:strokeColor': [value: string]
  }>()

  const { t } = useI18n()
  const presetColors = SCREENSHOT_PRESET_COLORS

  const strokeWidthModel = computed({
    get: () => props.strokeWidth,
    set: (value: number) => emit('update:strokeWidth', value)
  })

  const strokeColorModel = computed({
    get: () => props.strokeColor,
    set: (value: string) => emit('update:strokeColor', value)
  })
</script>

<style lang="scss" scoped>
  .screenshot-stroke-options {
    position: relative;
    margin-top: 8px;
    filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.12));

    &__arrow {
      position: absolute;
      top: -6px;
      left: 18px;
      width: 12px;
      height: 12px;
      background: var(--bg-primary-color);
      transform: rotate(45deg);
      border-radius: 2px 0 0 0;
    }

    &__body {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      height: 36px;
      padding: 0 12px;
      border-radius: 8px;
      background: var(--bg-primary-color);
      white-space: nowrap;
      user-select: none;
    }

    &__field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &__label {
      font-size: 13px;
      color: var(--text-muted-color);
    }

    &__slider {
      width: 88px;

      :deep(.n-slider-rail) {
        height: 4px;
      }

      :deep(.n-slider-handle) {
        width: 12px;
        height: 12px;
      }
    }

    &__value {
      min-width: 18px;
      font-size: 13px;
      color: var(--text-secondary-color);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    &__divider {
      width: 1px;
      height: 16px;
      background: var(--divider-color);
      flex-shrink: 0;
    }

    &__color-trigger {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 4px 2px 2px;
      border: none;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;

      &:hover {
        background: var(--icon-hover-color);
      }
    }

    &__color-swatch {
      width: 18px;
      height: 18px;
      border-radius: 3px;
      border: 1px solid var(--border-color);
      box-sizing: border-box;
    }

    &__chevron {
      width: 10px;
      height: 10px;
      color: var(--text-secondary-color);
    }

    &__palette {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px;
    }

    &__palette-item {
      width: 22px;
      height: 22px;
      border: 2px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
      box-sizing: border-box;

      &:hover {
        transform: scale(1.08);
      }

      &--active {
        border-color: var(--primary-color);
      }
    }
  }
</style>
