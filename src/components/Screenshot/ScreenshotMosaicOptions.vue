<template>
  <div class="screenshot-mosaic-options" :style="{ marginLeft: `${anchorLeft}px` }" @mousedown.stop>
    <div class="screenshot-mosaic-options__arrow" />
    <div class="screenshot-mosaic-options__body">
      <label class="screenshot-mosaic-options__field">
        <span class="screenshot-mosaic-options__label">{{ t('screenshot.strokeWidth') }}</span>
        <n-slider
          v-model:value="strokeWidthModel"
          class="screenshot-mosaic-options__slider"
          :min="1"
          :max="12"
          :step="1"
          :tooltip="false" />
        <span class="screenshot-mosaic-options__value">{{ strokeWidth }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  interface Props {
    strokeWidth: number
    anchorLeft?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    anchorLeft: 170
  })

  const emit = defineEmits<{
    'update:strokeWidth': [value: number]
  }>()

  const { t } = useI18n()

  const strokeWidthModel = computed({
    get: () => props.strokeWidth,
    set: (value: number) => emit('update:strokeWidth', value)
  })
</script>

<style lang="scss" scoped>
  .screenshot-mosaic-options {
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
  }
</style>
