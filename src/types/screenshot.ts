export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type ScreenshotTool = 'move' | 'rectangle' | 'arrow' | 'brush' | 'text' | 'mosaic'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export type AnnotationDrawTool = 'rectangle' | 'arrow' | 'brush' | 'mosaic'

export interface DragState {
  mode: 'create' | 'move' | 'resize'
  handle?: ResizeHandle
  startX: number
  startY: number
  origin: Rect
}

export interface AnnotationStrokeStyle {
  stroke: string
  strokeWidth: number
}

export interface RectangleAnnotation extends AnnotationStrokeStyle {
  id: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
}

export interface ArrowAnnotation extends AnnotationStrokeStyle {
  id: string
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface BrushAnnotation extends AnnotationStrokeStyle {
  id: string
  type: 'brush'
  points: Point[]
}

export interface TextAnnotation {
  id: string
  type: 'text'
  x: number
  y: number
  content: string
  fontSize: number
  stroke: string
}

export interface MosaicAnnotation {
  id: string
  type: 'mosaic'
  points: Point[]
  strokeWidth: number
}

export type ScreenshotAnnotation =
  | RectangleAnnotation
  | ArrowAnnotation
  | BrushAnnotation
  | MosaicAnnotation
  | TextAnnotation
