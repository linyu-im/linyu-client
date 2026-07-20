<template>
  <svg class="screenshot-annotation-layer" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="screenshot-mosaic-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="4" height="4" fill="#8e8e8e" />
        <rect x="4" y="4" width="4" height="4" fill="#8e8e8e" />
        <rect x="4" width="4" height="4" fill="#b5b5b5" />
        <rect y="4" width="4" height="4" fill="#b5b5b5" />
      </pattern>
      <marker
        v-for="shape in arrowAnnotations"
        :id="`screenshot-arrow-${shape.id}`"
        :key="`marker-${shape.id}`"
        markerUnits="strokeWidth"
        markerWidth="4"
        markerHeight="4"
        refX="3"
        refY="2"
        orient="auto">
        <path d="M0,0 L0,4 L4,2 z" :fill="shape.stroke" />
      </marker>
      <marker
        v-if="draftLine && draftStyle"
        id="screenshot-arrow-draft"
        markerUnits="strokeWidth"
        markerWidth="4"
        markerHeight="4"
        refX="3"
        refY="2"
        orient="auto">
        <path d="M0,0 L0,4 L4,2 z" :fill="draftStyle.stroke" />
      </marker>
    </defs>

    <template v-for="shape in annotations" :key="shape.id">
      <rect
        v-if="shape.type === 'rectangle'"
        :x="shape.x"
        :y="shape.y"
        :width="shape.width"
        :height="shape.height"
        fill="none"
        :stroke="shape.stroke"
        :stroke-width="shape.strokeWidth" />
      <line
        v-else-if="shape.type === 'arrow'"
        :x1="shape.x1"
        :y1="shape.y1"
        :x2="shape.x2"
        :y2="shape.y2"
        :stroke="shape.stroke"
        :stroke-width="shape.strokeWidth"
        stroke-linecap="round"
        :marker-end="`url(#screenshot-arrow-${shape.id})`" />
      <polyline
        v-else-if="shape.type === 'brush'"
        :points="toPolylinePoints(shape.points)"
        fill="none"
        :stroke="shape.stroke"
        :stroke-width="shape.strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round" />
      <template v-else-if="shape.type === 'mosaic'">
        <circle
          v-for="(point, index) in getMosaicStampPoints(shape.points, getMosaicRadius(shape.strokeWidth))"
          :key="`${shape.id}-${index}`"
          :cx="point.x"
          :cy="point.y"
          :r="getMosaicRadius(shape.strokeWidth)"
          fill="url(#screenshot-mosaic-pattern)"
          opacity="0.92" />
      </template>
      <text
        v-else
        :x="shape.x"
        :y="shape.y"
        :fill="shape.stroke"
        :font-size="shape.fontSize"
        dominant-baseline="hanging">
        <tspan
          v-for="(line, index) in toTextLines(shape.content)"
          :key="index"
          :x="shape.x"
          :dy="index === 0 ? 0 : shape.fontSize * 1.2">
          {{ line }}
        </tspan>
      </text>
    </template>

    <rect
      v-if="draftRect && draftStyle"
      :x="draftRect.x"
      :y="draftRect.y"
      :width="draftRect.width"
      :height="draftRect.height"
      fill="none"
      :stroke="draftStyle.stroke"
      :stroke-width="draftStyle.strokeWidth" />

    <line
      v-if="draftLine && draftStyle"
      :x1="draftLine.x1"
      :y1="draftLine.y1"
      :x2="draftLine.x2"
      :y2="draftLine.y2"
      :stroke="draftStyle.stroke"
      :stroke-width="draftStyle.strokeWidth"
      stroke-linecap="round"
      marker-end="url(#screenshot-arrow-draft)" />

    <polyline
      v-if="draftPath?.length && draftStyle && draftPathMode === 'brush'"
      :points="toPolylinePoints(draftPath)"
      fill="none"
      :stroke="draftStyle.stroke"
      :stroke-width="draftStyle.strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round" />

    <template v-if="draftPath?.length && draftStyle && draftPathMode === 'mosaic'">
      <circle
        v-for="(point, index) in getMosaicStampPoints(draftPath, getMosaicRadius(draftStyle.strokeWidth))"
        :key="`draft-mosaic-${index}`"
        :cx="point.x"
        :cy="point.y"
        :r="getMosaicRadius(draftStyle.strokeWidth)"
        fill="url(#screenshot-mosaic-pattern)"
        opacity="0.92" />
    </template>
  </svg>
</template>

<script setup lang="ts">
  import { getMosaicRadius, getMosaicStampPoints } from '@/utils/screenshot/screenshotMosaic'
  import type { AnnotationStrokeStyle, Line, Point, Rect, ScreenshotAnnotation } from '@/types/screenshot'

  interface Props {
    annotations: ScreenshotAnnotation[]
    draftRect?: Rect | null
    draftLine?: Line | null
    draftPath?: Point[] | null
    draftPathMode?: 'brush' | 'mosaic' | null
    draftStyle?: AnnotationStrokeStyle | null
  }

  const props = withDefaults(defineProps<Props>(), {
    draftRect: null,
    draftLine: null,
    draftPath: null,
    draftPathMode: null,
    draftStyle: null
  })

  const arrowAnnotations = computed(() => props.annotations.filter((item) => item.type === 'arrow'))

  const toPolylinePoints = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ')

  const toTextLines = (content: string) => content.split('\n')
</script>

<style lang="scss" scoped>
  .screenshot-annotation-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
