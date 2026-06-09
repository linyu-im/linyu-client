<template>
  <div class="screenshot-selection-bar" @mousedown.stop>
    <span class="screenshot-selection-bar__size">
      {{ t('screenshot.size', { width: Math.round(width), height: Math.round(height) }) }}
    </span>
    <span class="screenshot-selection-bar__divider" />
    <label class="screenshot-selection-bar__field">
      <span class="screenshot-selection-bar__label">{{ t('screenshot.roundedCorner') }}</span>
      <n-slider
        v-model:value="cornerRadiusModel"
        class="screenshot-selection-bar__slider"
        :min="0"
        :max="24"
        :step="1"
        :tooltip="false" />
      <span class="screenshot-selection-bar__value">{{ cornerRadius }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  interface Props {
    width: number
    height: number
    cornerRadius: number
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    'update:cornerRadius': [value: number]
  }>()

  const { t } = useI18n()

  const cornerRadiusModel = computed({
    get: () => props.cornerRadius,
    set: (value: number) => emit('update:cornerRadius', value)
  })
</script>

<style lang="scss" scoped>
  .screenshot-selection-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    background: var(--bg-primary-color);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    white-space: nowrap;
    user-select: none;

    &__size {
      font-size: 13px;
      color: var(--text-muted-color);
      font-variant-numeric: tabular-nums;
    }

    &__divider {
      width: 1px;
      height: 16px;
      background: var(--divider-color);
      flex-shrink: 0;
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
