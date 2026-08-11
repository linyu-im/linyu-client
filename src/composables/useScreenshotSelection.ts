import type { DragState, Rect, ResizeHandle } from '@/types/screenshot'

const MIN_SIZE = 24
const MASK_COLOR = 'rgba(0, 0, 0, 0.45)'

const RESIZE_CURSOR: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize'
}

export function useScreenshotSelection(containerRef: Ref<HTMLElement | null>) {
  const selection = ref<Rect | null>(null)
  const dragState = ref<DragState | null>(null)

  let activePointerId: number | null = null
  let captureTarget: Element | null = null
  let previousBodyCursor = ''
  let createGuardUntil = 0

  /** 打开截图窗后短暂忽略新建选区，避免焦点/快捷键残余 pointer 误触 */
  const armCreateGuard = (ms = 200) => {
    createGuardUntil = Date.now() + ms
  }

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

  const getPoint = (event: PointerEvent | MouseEvent) => {
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

  const setDragCursor = (mode: DragState['mode'], handle?: ResizeHandle) => {
    previousBodyCursor = document.body.style.cursor
    if (mode === 'resize' && handle) {
      document.body.style.cursor = RESIZE_CURSOR[handle]
      return
    }
    if (mode === 'move') {
      document.body.style.cursor = 'move'
      return
    }
    document.body.style.cursor = 'crosshair'
  }

  const clearDragCursor = () => {
    document.body.style.cursor = previousBodyCursor
    previousBodyCursor = ''
  }

  const beginCapture = (event: PointerEvent) => {
    const target = event.currentTarget
    if (!(target instanceof Element)) return
    activePointerId = event.pointerId
    captureTarget = target
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // ignore capture failures on unsupported targets
    }
  }

  const endCapture = () => {
    if (captureTarget && activePointerId !== null) {
      try {
        if (captureTarget.hasPointerCapture?.(activePointerId)) {
          captureTarget.releasePointerCapture(activePointerId)
        }
      } catch {
        // ignore
      }
    }
    captureTarget = null
    activePointerId = null
  }

  const onOverlayPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    if (Date.now() < createGuardUntil) return
    const target = event.target
    if (
      target instanceof Element &&
      target.closest(
        '.screenshot-editor__toolbar, .screenshot-editor__selection-bar, .screenshot-toolbar, .screenshot-toolbar-wrap, .screenshot-selection-bar, .screenshot-stroke-options, .screenshot-mosaic-options'
      )
    ) {
      return
    }
    event.preventDefault()
    const point = getPoint(event)
    dragState.value = {
      mode: 'create',
      startX: point.x,
      startY: point.y,
      origin: { x: point.x, y: point.y, width: 0, height: 0 }
    }
    selection.value = { x: point.x, y: point.y, width: 0, height: 0 }
    beginCapture(event)
    setDragCursor('create')
  }

  const onSelectionPointerDown = (event: PointerEvent, mode: 'move' | 'resize', handle?: ResizeHandle) => {
    if (event.button !== 0 || !selection.value) return
    event.preventDefault()
    event.stopPropagation()
    const point = getPoint(event)
    dragState.value = {
      mode,
      handle,
      startX: point.x,
      startY: point.y,
      origin: { ...selection.value }
    }
    beginCapture(event)
    setDragCursor(mode, handle)
  }

  const onPointerMove = (event: PointerEvent) => {
    const state = dragState.value
    if (!state) return
    if (activePointerId !== null && event.pointerId !== activePointerId) return

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

  const onPointerUp = (event: PointerEvent) => {
    if (!dragState.value) return
    if (activePointerId !== null && event.pointerId !== activePointerId) return

    dragState.value = null
    endCapture()
    clearDragCursor()

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
    armCreateGuard(200)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('resize', onWindowResize)
  })

  onUnmounted(() => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('resize', onWindowResize)
    endCapture()
    clearDragCursor()
  })

  return {
    selection,
    hasSelection,
    showSelection,
    showEditorChrome,
    selectionStyle,
    onOverlayPointerDown,
    onSelectionPointerDown,
    armCreateGuard
  }
}
