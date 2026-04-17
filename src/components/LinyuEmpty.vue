<template>
  <div class="flex h-full w-full justify-center items-center flex-1">
    <svg>
      <use href="#linyu2"></use>
    </svg>
  </div>
</template>
<script setup lang="ts">
  interface Props {
    size?: number
  }
  const props = withDefaults(defineProps<Props>(), {
    size: 100
  })
</script>

<style scoped lang="scss">
  svg {
    width: v-bind(size) + 'px';
    height: v-bind(size) + 'px';
    color: var(--card-bg-color);
  }
</style>
