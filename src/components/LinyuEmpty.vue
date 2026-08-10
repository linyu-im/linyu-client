<template>
  <div class="flex h-full w-full justify-center items-center flex-1 bg-[var(--bg-secondary-color)]">
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

  const sizePx = computed(() => `${props.size}px`)
</script>

<style scoped lang="scss">
  svg {
    width: v-bind(sizePx);
    height: v-bind(sizePx);
    color: var(--card-bg-color);
  }
</style>
