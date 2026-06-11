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
    radius: 5,
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
    position: relative;
    overflow: hidden;
  }

  svg {
    color: v-bind(color);
    fill: currentColor;
    transition:
      color 0.2s ease,
      transform 0.22s ease,
      opacity 0.22s ease;
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
    transition: background-color 0.22s ease;
  }

  .icon-wrapper::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 42%;
    height: 42%;
    border-radius: 999px;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.75);
    background: radial-gradient(circle, rgba(var(--primary-rgb), 0.28) 0%, rgba(var(--primary-rgb), 0) 72%);
  }

  .icon-wrapper.is-active::after {
    animation: icon-ripple 0.34s ease-out;
  }

  .icon-wrapper.is-active svg {
    color: var(--icon-active-color);
    animation: icon-activate 0.24s cubic-bezier(0.2, 0.75, 0.2, 1);
  }

  @keyframes icon-activate {
    0% {
      opacity: 0.55;
      transform: scale(0.84);
    }

    65% {
      opacity: 1;
      transform: scale(1.08);
    }

    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes icon-ripple {
    0% {
      opacity: 0.34;
      transform: translate(-50%, -50%) scale(0.75);
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.85);
    }
  }
</style>
