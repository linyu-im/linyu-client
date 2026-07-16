<template>
  <img v-if="url" class="emotion-icon" :style="iconStyle" :src="url" alt="" />
</template>

<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      url?: string
      size?: number
    }>(),
    {
      url: '',
      size: 14
    }
  )

  const iconStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`
  }))
</script>

<style scoped lang="scss">
  .emotion-icon {
    display: block;
    flex-shrink: 0;
    object-fit: contain;
  }
</style>
