import { getScreenshotTextFontSize } from '@/constants/screenshot'
import type {
  AnnotationDrawTool,
  AnnotationStrokeStyle,
  Line,
  Point,
  Rect,
  ScreenshotAnnotation
} from '@/types/screenshot'

const MIN_ANNOTATION_SIZE = 4
const MIN_ARROW_LENGTH = 8
const MIN_BRUSH_LENGTH = 8
const BRUSH_POINT_DISTANCE = 2

let annotationId = 0

const nextAnnotationId = (type: ScreenshotAnnotation['type']) => `${type}-${++annotationId}`

const createRectangle = (rect: Rect, style: AnnotationStrokeStyle): ScreenshotAnnotation => ({
  id: nextAnnotationId('rectangle'),
  type: 'rectangle',
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
  stroke: style.stroke,
  strokeWidth: style.strokeWidth
})

const createArrow = (line: Line, style: AnnotationStrokeStyle): ScreenshotAnnotation => ({
  id: nextAnnotationId('arrow'),
  type: 'arrow',
  x1: line.x1,
  y1: line.y1,
  x2: line.x2,
  y2: line.y2,
  stroke: style.stroke,
  strokeWidth: style.strokeWidth
})

const createBrush = (points: Point[], style: AnnotationStrokeStyle): ScreenshotAnnotation => ({
  id: nextAnnotationId('brush'),
  type: 'brush',
  points: points.map((point) => ({ ...point })),
  stroke: style.stroke,
  strokeWidth: style.strokeWidth
})

const createMosaic = (points: Point[], strokeWidth: number): ScreenshotAnnotation => ({
  id: nextAnnotationId('mosaic'),
  type: 'mosaic',
  points: points.map((point) => ({ ...point })),
  strokeWidth
})

const createText = (point: Point, content: string, style: AnnotationStrokeStyle): ScreenshotAnnotation => ({
  id: nextAnnotationId('text'),
  type: 'text',
  x: point.x,
  y: point.y,
  content,
  fontSize: getScreenshotTextFontSize(style.strokeWidth),
  stroke: style.stroke
})

const normalizeRect = (start: Point, end: Point): Rect => {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  return { x, y, width, height }
}

const createLine = (start: Point, end: Point): Line => ({
  x1: start.x,
  y1: start.y,
  x2: end.x,
  y2: end.y
})

const getLineLength = (line: Line) => Math.hypot(line.x2 - line.x1, line.y2 - line.y1)

const getPathLength = (points: Point[]) => {
  let length = 0
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return length
}

export function useScreenshotAnnotations(previewRef: Ref<HTMLElement | null>, strokeStyle: Ref<AnnotationStrokeStyle>) {
  const history = ref<ScreenshotAnnotation[][]>([[]])
  const historyIndex = ref(0)
  const drawTool = ref<AnnotationDrawTool | null>(null)
  const drawStart = ref<Point | null>(null)
  const draftRect = ref<Rect | null>(null)
  const draftLine = ref<Line | null>(null)
  const draftPath = ref<Point[] | null>(null)
  const draftPathMode = ref<'brush' | 'mosaic' | null>(null)
  const textDraft = ref<Point | null>(null)
  const textDraftKey = ref(0)
  const isDrawing = ref(false)

  const annotations = computed(() => history.value[historyIndex.value] ?? [])
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)
  const draftStyle = computed(() => strokeStyle.value)

  const commit = (next: ScreenshotAnnotation[]) => {
    const truncated = history.value.slice(0, historyIndex.value + 1)
    truncated.push(next.map((item) => ({ ...item })))
    history.value = truncated
    historyIndex.value = truncated.length - 1
  }

  const addRectangle = (rect: Rect) => {
    if (rect.width < MIN_ANNOTATION_SIZE || rect.height < MIN_ANNOTATION_SIZE) return
    commit([...annotations.value, createRectangle(rect, strokeStyle.value)])
  }

  const addArrow = (line: Line) => {
    if (getLineLength(line) < MIN_ARROW_LENGTH) return
    commit([...annotations.value, createArrow(line, strokeStyle.value)])
  }

  const addBrush = (points: Point[]) => {
    if (points.length < 2 || getPathLength(points) < MIN_BRUSH_LENGTH) return
    commit([...annotations.value, createBrush(points, strokeStyle.value)])
  }

  const addMosaic = (points: Point[]) => {
    if (points.length < 2 || getPathLength(points) < MIN_BRUSH_LENGTH) return
    commit([...annotations.value, createMosaic(points, strokeStyle.value.strokeWidth)])
  }

  const addText = (point: Point, content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    commit([...annotations.value, createText(point, trimmed, strokeStyle.value)])
  }

  const cancelTextDraft = () => {
    textDraft.value = null
  }

  const undo = () => {
    if (!canUndo.value) return
    historyIndex.value -= 1
  }

  const redo = () => {
    if (!canRedo.value) return
    historyIndex.value += 1
  }

  const getPoint = (event: MouseEvent) => {
    const el = previewRef.value
    if (!el) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, rect.height))
    }
  }

  const resetDraft = () => {
    draftRect.value = null
    draftLine.value = null
    draftPath.value = null
    draftPathMode.value = null
    drawStart.value = null
    drawTool.value = null
  }

  const appendBrushPoint = (point: Point) => {
    if (!draftPath.value?.length) {
      draftPath.value = [point]
      return
    }
    const last = draftPath.value[draftPath.value.length - 1]
    if (Math.hypot(point.x - last.x, point.y - last.y) < BRUSH_POINT_DISTANCE) return
    draftPath.value = [...draftPath.value, point]
  }

  const onTextPlace = (event: MouseEvent) => {
    event.stopPropagation()
    textDraftKey.value += 1
    textDraft.value = getPoint(event)
  }

  const submitTextDraft = (content: string) => {
    if (!textDraft.value) return
    const point = { ...textDraft.value }
    textDraft.value = null
    addText(point, content)
  }

  const onDrawMouseDown = (event: MouseEvent, tool: AnnotationDrawTool) => {
    if (event.button !== 0) return
    event.stopPropagation()
    const point = getPoint(event)
    drawTool.value = tool
    drawStart.value = point
    draftRect.value = null
    draftLine.value = null
    draftPath.value = null

    if (tool === 'rectangle') {
      draftRect.value = { x: point.x, y: point.y, width: 0, height: 0 }
    } else if (tool === 'arrow') {
      draftLine.value = createLine(point, point)
    } else if (tool === 'brush') {
      draftPathMode.value = 'brush'
      draftPath.value = [point]
    } else {
      draftPathMode.value = 'mosaic'
      draftPath.value = [point]
    }
    isDrawing.value = true
  }

  const onDrawMouseMove = (event: MouseEvent) => {
    if (!isDrawing.value || !drawStart.value || !drawTool.value) return
    const point = getPoint(event)

    if (drawTool.value === 'rectangle') {
      draftRect.value = normalizeRect(drawStart.value, point)
      return
    }

    if (drawTool.value === 'arrow') {
      draftLine.value = createLine(drawStart.value, point)
      return
    }

    if (drawTool.value === 'brush' || drawTool.value === 'mosaic') {
      appendBrushPoint(point)
    }
  }

  const onDrawMouseUp = () => {
    if (!isDrawing.value) return
    isDrawing.value = false
    const tool = drawTool.value

    if (tool === 'rectangle' && draftRect.value) {
      addRectangle(draftRect.value)
    }
    if (tool === 'arrow' && draftLine.value) {
      addArrow(draftLine.value)
    }
    if (tool === 'brush' && draftPath.value) {
      addBrush(draftPath.value)
    }
    if (tool === 'mosaic' && draftPath.value) {
      addMosaic(draftPath.value)
    }
    resetDraft()
  }

  onMounted(() => {
    window.addEventListener('mousemove', onDrawMouseMove)
    window.addEventListener('mouseup', onDrawMouseUp)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', onDrawMouseMove)
    window.removeEventListener('mouseup', onDrawMouseUp)
  })

  return {
    annotations,
    draftRect,
    draftLine,
    draftPath,
    draftPathMode,
    textDraft,
    textDraftKey,
    draftStyle,
    canUndo,
    canRedo,
    undo,
    redo,
    onDrawMouseDown,
    onTextPlace,
    submitTextDraft,
    cancelTextDraft
  }
}
