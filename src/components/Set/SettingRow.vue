<template>
  <div class="setting-row" :class="{ 'setting-row--border': border, 'setting-row--stack': stack }">
    <div class="setting-row__main">
      <div class="setting-row__label">
        <slot name="label">{{ label }}</slot>
      </div>
      <div v-if="desc || $slots.desc" class="setting-row__desc">
        <slot name="desc">{{ desc }}</slot>
      </div>
    </div>
    <div v-if="$slots.default" class="setting-row__control">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
  withDefaults(
    defineProps<{
      label?: string
      desc?: string
      border?: boolean
      stack?: boolean
    }>(),
    {
      label: '',
      desc: '',
      border: true,
      stack: false
    }
  )
</script>

<style scoped lang="scss">
  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    min-height: 52px;
    box-sizing: border-box;

    &--border + &--border {
      border-top: 1px solid color-mix(in srgb, var(--border-color) 45%, transparent);
    }

    &--stack {
      flex-direction: column;
      align-items: stretch;

      .setting-row__control {
        width: 100%;
        justify-content: flex-start;
      }
    }

    &__main {
      flex: 1;
      min-width: 0;
    }

    &__label {
      font-size: 14px;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__desc {
      margin-top: 4px;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.45;
    }

    &__control {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
  }
</style>
