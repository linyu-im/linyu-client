<template>
  <div class="split" :class="{ 'split--vertical': direction === 'vertical' }">
    <div class="split__first" :style="firstPanelStyle">
      <slot name="first"></slot>
    </div>
    <div class="split__handle" @mousedown="onResizeStart"></div>
    <div class="split__second" :style="secondPanelStyle">
      <slot name="second"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface Props {
    direction?: 'horizontal' | 'vertical'
    fixed?: 'first' | 'second'
    minSize?: number
    maxSize?: number
    defaultSize?: number
  }

  const props = withDefaults(defineProps<Props>(), {
    direction: 'horizontal',
    fixed: 'first',
    minSize: 180,
    maxSize: 300,
    defaultSize: 240
  })

  const panelSize = ref(props.defaultSize)
  const isResizing = ref(false)

  const sizeProp = computed(() => (props.direction === 'vertical' ? 'height' : 'width'))

  const firstPanelStyle = computed(() => {
    if (props.fixed === 'first') {
      return { [sizeProp.value]: panelSize.value + 'px', flexShrink: 0 }
    }
    return { flex: '1' }
  })

  const secondPanelStyle = computed(() => {
    if (props.fixed === 'second') {
      return { [sizeProp.value]: panelSize.value + 'px', flexShrink: 0 }
    }
    return { flex: '1' }
  })

  const onResizeStart = (e: MouseEvent) => {
    e.preventDefault()
    isResizing.value = true
    const startPos = props.direction === 'vertical' ? e.clientY : e.clientX
    const startSize = panelSize.value

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = props.direction === 'vertical' ? moveEvent.clientY : moveEvent.clientX
      const delta = currentPos - startPos
      const adjustedDelta = props.fixed === 'second' ? -delta : delta
      panelSize.value = Math.min(props.maxSize, Math.max(props.minSize, startSize + adjustedDelta))
    }

    const onMouseUp = () => {
      isResizing.value = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = props.direction === 'vertical' ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
</script>

<style scoped lang="scss">
  .split {
    display: flex;
    height: 100%;
    width: 100%;

    &--vertical {
      flex-direction: column;
    }

    .split__first,
    .split__second {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .split__second {
      display: flex;
      flex-direction: column;
    }

    .split__handle {
      flex-shrink: 0;
      position: relative;
      background-color: var(--divider-color);

      &::after {
        content: '';
        position: absolute;
      }
    }

    &:not(.split--vertical) .split__handle {
      width: 1px;
      cursor: col-resize;

      &::after {
        top: 0;
        bottom: 0;
        left: -5px;
        right: -5px;
      }
    }

    &.split--vertical .split__handle {
      width: 100%;
      height: 1px;
      cursor: row-resize;

      &::after {
        left: 0;
        right: 0;
        top: -5px;
        bottom: -5px;
      }
    }
  }
</style>
