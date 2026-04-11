<template>
  <div
    class="icon-wrapper flex items-center justify-center transition-all duration-200 select-none"
    :class="[disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer group', { 'is-active': active }]"
    :style="wrapperStyle"
    @click="handleClick">
    <svg class="pointer-events-none">
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
    iconSize?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 32,
    radius: 2,
    color: 'var(--text-muted-color)',
    hoverColor: 'var(--text-muted-color)',
    bg: 'transparent',
    hoverBg: 'var(--icon-hover-color)',
    disabled: false,
    active: false,
    iconSize: '60%'
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

  svg {
    color: v-bind(color);
    fill: currentColor;
    transition: color 0.2s;
    width: v-bind(iconSize);
    height: v-bind(iconSize);
  }

  .icon-wrapper:not(.cursor-not-allowed):not(.is-active):hover {
    background: v-bind(hoverBg);
  }

  .icon-wrapper:not(.cursor-not-allowed):not(.is-active):hover svg {
    color: v-bind(hoverColor);
  }

  .icon-wrapper.is-active {
    background: rgba(var(--primary-rgb), 0.1) !important;
  }

  .icon-wrapper.is-active svg {
    color: var(--icon-active-color);
  }
</style>
