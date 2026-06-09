import type { DragState, Rect, ResizeHandle } from '@/types/screenshot'

const MIN_SIZE = 24
const MASK_COLOR = 'rgba(0, 0, 0, 0.45)'

export function useScreenshotSelection(containerRef: Ref<HTMLElement | null>) {
  const selection = ref<Rect | null>(null)
  const dragState = ref<DragState | null>(null)

  const hasSelection = computed(() => {
    const rect = selection.value
    return !!rect && rect.width >= MIN_SIZE && rect.height >= MIN_SIZE
  })

  const isCreating = computed(() => dragState.value?.mode === 'create')

  const showSelection = computed(() => {
    const rect = selection.value
    if (!rect) return false
    if (isCreating.value) return rect.width > 0 || rect.height > 0
    return hasSelection.value
  })

  const showEditorChrome = computed(() => hasSelection.value && !isCreating.value)

  const selectionStyle = computed(() => {
    if (!selection.value) return {}
    const { x, y, width, height } = selection.value
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      ...(hasSelection.value ? { boxShadow: `0 0 0 9999px ${MASK_COLOR}` } : {})
    }
  })

  const getBounds = () => {
    const el = containerRef.value
    if (!el) return { width: 0, height: 0 }
    const rect = el.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }

  const getPoint = (event: MouseEvent) => {
    const el = containerRef.value
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const bounds = getBounds()
    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, bounds.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, bounds.height))
    }
  }

  const clampRect = (rect: Rect): Rect => {
    const bounds = getBounds()
    const width = Math.max(MIN_SIZE, Math.min(rect.width, bounds.width))
    const height = Math.max(MIN_SIZE, Math.min(rect.height, bounds.height))
    const x = Math.max(0, Math.min(rect.x, bounds.width - width))
    const y = Math.max(0, Math.min(rect.y, bounds.height - height))
    return { x, y, width, height }
  }

  const resizeRect = (origin: Rect, handle: ResizeHandle, dx: number, dy: number): Rect => {
    let { x, y, width, height } = origin

    if (handle.includes('e')) width = origin.width + dx
    if (handle.includes('w')) {
      width = origin.width - dx
      x = origin.x + dx
    }
    if (handle.includes('s')) height = origin.height + dy
    if (handle.includes('n')) {
      height = origin.height - dy
      y = origin.y + dy
    }

    if (width < MIN_SIZE) {
      if (handle.includes('w')) x -= MIN_SIZE - width
      width = MIN_SIZE
    }
    if (height < MIN_SIZE) {
      if (handle.includes('n')) y -= MIN_SIZE - height
      height = MIN_SIZE
    }

    return clampRect({ x, y, width, height })
  }

  const onOverlayMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return
    const point = getPoint(event)
    dragState.value = {
      mode: 'create',
      startX: point.x,
      startY: point.y,
      origin: { x: point.x, y: point.y, width: 0, height: 0 }
    }
    selection.value = { x: point.x, y: point.y, width: 0, height: 0 }
  }

  const onSelectionMouseDown = (event: MouseEvent, mode: 'move' | 'resize', handle?: ResizeHandle) => {
    if (event.button !== 0 || !selection.value) return
    event.stopPropagation()
    const point = getPoint(event)
    dragState.value = {
      mode,
      handle,
      startX: point.x,
      startY: point.y,
      origin: { ...selection.value }
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    const state = dragState.value
    if (!state) return
    const point = getPoint(event)
    const dx = point.x - state.startX
    const dy = point.y - state.startY

    if (state.mode === 'create') {
      const x = Math.min(state.startX, point.x)
      const y = Math.min(state.startY, point.y)
      const width = Math.abs(point.x - state.startX)
      const height = Math.abs(point.y - state.startY)
      selection.value = clampRect({ x, y, width, height })
      return
    }

    if (state.mode === 'move') {
      selection.value = clampRect({
        ...state.origin,
        x: state.origin.x + dx,
        y: state.origin.y + dy
      })
      return
    }

    if (state.mode === 'resize' && state.handle) {
      selection.value = resizeRect(state.origin, state.handle, dx, dy)
    }
  }

  const onMouseUp = () => {
    if (!dragState.value) return
    dragState.value = null
    if (selection.value && (selection.value.width < MIN_SIZE || selection.value.height < MIN_SIZE)) {
      selection.value = null
    }
  }

  const onWindowResize = () => {
    if (selection.value) {
      selection.value = clampRect(selection.value)
    }
  }

  onMounted(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('resize', onWindowResize)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('resize', onWindowResize)
  })

  return {
    selection,
    hasSelection,
    showSelection,
    showEditorChrome,
    selectionStyle,
    onOverlayMouseDown,
    onSelectionMouseDown
  }
}
