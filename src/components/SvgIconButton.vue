<template>
  <div
    class="icon-wrapper flex items-center justify-center transition-all duration-200 select-none"
    :class="[disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group', { 'is-active': active }]"
    :style="wrapperStyle"
    @click="handleClick">
    <svg class="w-full h-full pointer-events-none">
      <use :href="href"></use>
    </svg>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    href: string
    size?: number
    radius?: number | string
    color?: string
    hoverColor?: string
    bg?: string
    hoverBg?: string
    disabled?: boolean
    active?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 32,
    radius: 2,
    color: '#9D9D9D',
    hoverColor: '#000',
    bg: 'transparent',
    hoverBg: 'var(--icon-hover-color)',
    disabled: false,
    active: false
  })

  const emit = defineEmits(['click'])

  const handleClick = (e: MouseEvent) => {
    if (props.disabled) return
    emit('click', e)
  }

  const wrapperStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
    borderRadius: typeof props.radius === 'number' ? `${props.radius}px` : props.radius
  }))
</script>

<style scoped>
  .icon-wrapper {
    background: v-bind(bg);
  }

  .icon-wrapper:not(.cursor-not-allowed):hover,
  .icon-wrapper.is-active {
    background: v-bind(hoverBg) !important;
    color: v-bind(hoverColor);
  }

  svg {
    color: v-bind(color);
    fill: currentColor;
    transition: color 0.2s;
  }

  .icon-wrapper:not(.cursor-not-allowed):hover svg,
  .icon-wrapper.is-active svg {
    color: v-bind(hoverColor);
  }
</style>
