<template>
  <span
    v-if="label"
    class="color-tag"
    :style="{
      '--color-tag-color': color
    }">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
  defineProps<{
    label: string
    color: string
  }>()
</script>

<style scoped lang="scss">
  .color-tag {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 11px;
    line-height: 1.35;
    user-select: none;
    color: var(--color-tag-color);
    background: color-mix(in srgb, var(--color-tag-color) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-tag-color) 36%, transparent);
  }
</style>
