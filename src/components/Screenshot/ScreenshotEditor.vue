<template>
  <div ref="containerRef" class="screenshot-editor" @mousedown="onOverlayMouseDown">
    <div v-if="!hasSelection" class="screenshot-editor__screen-frame" />

    <template v-if="showSelection && selection">
      <div class="screenshot-editor__selection" :style="selectionBoxStyle">
        <div
          v-if="showEditorChrome"
          class="screenshot-editor__preview"
          :class="{
            'screenshot-editor__preview--move': activeTool === 'move',
            'screenshot-editor__preview--draw': isDrawTool,
            'screenshot-editor__preview--text': activeTool === 'text'
          }"
          :style="previewStyle"
          @mousedown.stop="onPreviewMouseDown"
          @click.stop="onPreviewClick">
          <div ref="previewRef" class="screenshot-editor__canvas">
            <ScreenshotAnnotationLayer
              :annotations="annotations"
              :draft-rect="draftRect"
              :draft-line="draftLine"
              :draft-path="draftPath"
              :draft-path-mode="draftPathMode"
              :draft-style="draftStyle" />
            <ScreenshotTextInput
              v-if="textDraft"
              :key="textDraftKey"
              :position="textDraft"
              :stroke-color="strokeColor"
              :stroke-width="strokeWidth"
              @submit="submitTextDraft"
              @cancel="cancelTextDraft" />
          </div>
        </div>
        <div v-else class="screenshot-editor__preview screenshot-editor__preview--creating" />

        <template v-if="showEditorChrome">
          <div
            v-for="handle in resizeHandles"
            :key="handle"
            class="screenshot-editor__handle"
            :class="`screenshot-editor__handle--${handle}`"
            @mousedown="onHandleMouseDown($event, handle)" />
        </template>
      </div>

      <div v-if="showEditorChrome" class="screenshot-editor__selection-bar" :style="selectionBarStyle">
        <ScreenshotSelectionBar
          :width="selection.width"
          :height="selection.height"
          :corner-radius="cornerRadius"
          @update:corner-radius="cornerRadius = $event" />
      </div>

      <div v-if="showEditorChrome" class="screenshot-editor__toolbar" :style="toolbarStyle">
        <ScreenshotToolbar
          v-model:active-tool="activeTool"
          v-model:stroke-width="strokeWidth"
          v-model:stroke-color="strokeColor"
          :can-undo="canUndo"
          :can-redo="canRedo"
          @undo="onUndo"
          @redo="onRedo"
          @download="onDownload"
          @cancel="onCancel"
          @confirm="onConfirm" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import ScreenshotAnnotationLayer from './ScreenshotAnnotationLayer.vue'
  import ScreenshotSelectionBar from './ScreenshotSelectionBar.vue'
  import ScreenshotTextInput from './ScreenshotTextInput.vue'
  import ScreenshotToolbar from './ScreenshotToolbar.vue'
  import { SCREENSHOT_DEFAULT_STROKE_STYLE, SCREENSHOT_DRAW_TOOLS } from '@/constants/screenshot'
  import { useScreenshotAnnotations } from '@/composables/useScreenshotAnnotations'
  import { useScreenshotSelection } from '@/composables/useScreenshotSelection'
  import { exportScreenshotToClipboard } from '@/utils/screenshotExport'
  import type { AnnotationDrawTool, ResizeHandle, ScreenshotTool } from '@/types/screenshot'

  const emit = defineEmits<{
    close: []
  }>()

  const { t } = useI18n()

  const containerRef = ref<HTMLElement | null>(null)
  const previewRef = ref<HTMLElement | null>(null)
  const {
    selection,
    hasSelection,
    showSelection,
    showEditorChrome,
    selectionStyle,
    onOverlayMouseDown,
    onSelectionMouseDown
  } = useScreenshotSelection(containerRef)
  const strokeWidth = ref(SCREENSHOT_DEFAULT_STROKE_STYLE.strokeWidth)
  const strokeColor = ref(SCREENSHOT_DEFAULT_STROKE_STYLE.stroke)
  const strokeStyle = computed(() => ({
    stroke: strokeColor.value,
    strokeWidth: strokeWidth.value
  }))
  const {
    annotations,
    draftRect,
    draftLine,
    draftPath,
    draftPathMode,
    textDraft,
    draftStyle,
    canUndo,
    canRedo,
    undo,
    redo,
    onDrawMouseDown,
    textDraftKey,
    onTextPlace,
    submitTextDraft,
    cancelTextDraft
  } = useScreenshotAnnotations(previewRef, strokeStyle)

  const activeTool = ref<ScreenshotTool>('move')
  const isDrawTool = computed(() => SCREENSHOT_DRAW_TOOLS.includes(activeTool.value as AnnotationDrawTool))

  watch(activeTool, (tool, prev) => {
    if (prev === 'text' && tool !== 'text' && textDraft.value) {
      cancelTextDraft()
    }
  })
  const cornerRadius = ref(0)
  const isExporting = ref(false)

  const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

  const selectionBoxStyle = computed(() => selectionStyle.value)

  const previewStyle = computed(() => ({
    borderRadius: `${cornerRadius.value}px`
  }))

  const selectionBarStyle = computed(() => {
    if (!selection.value) return {}
    return {
      left: `${selection.value.x}px`,
      top: `${Math.max(8, selection.value.y - 44)}px`
    }
  })

  const toolbarStyle = computed(() => {
    if (!selection.value) return {}
    const centerX = selection.value.x + selection.value.width / 2
    return {
      left: `${centerX}px`,
      top: `${selection.value.y + selection.value.height + 10}px`,
      transform: 'translateX(-50%)'
    }
  })

  const onPreviewMouseDown = (event: MouseEvent) => {
    if (activeTool.value === 'move') {
      onSelectionMouseDown(event, 'move')
      return
    }
    if (activeTool.value === 'text') {
      return
    }
    if (isDrawTool.value) {
      onDrawMouseDown(event, activeTool.value as AnnotationDrawTool)
    }
  }

  const onPreviewClick = (event: MouseEvent) => {
    if (activeTool.value !== 'text') return
    onTextPlace(event)
  }

  const onHandleMouseDown = (event: MouseEvent, handle: ResizeHandle) => {
    onSelectionMouseDown(event, 'resize', handle)
  }

  const onUndo = () => {
    undo()
  }

  const onRedo = () => {
    redo()
  }

  const onDownload = () => {
    window.$message.info(t('screenshot.todo'))
  }

  const onCancel = () => {
    emit('close')
  }

  const onConfirm = async () => {
    if (isExporting.value || !selection.value || !previewRef.value) return

    if (textDraft.value) {
      cancelTextDraft()
    }

    isExporting.value = true
    try {
      await exportScreenshotToClipboard({
        selection: selection.value,
        previewElement: previewRef.value,
        cornerRadius: cornerRadius.value
      })
      window.$message.success(t('screenshot.copied'))
      emit('close')
    } catch (error) {
      console.error('screenshot export failed', error)
      window.$message.error(t('screenshot.copyFailed'))
    } finally {
      isExporting.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .screenshot-editor {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    cursor: crosshair;
    background: transparent;

    &__screen-frame {
      position: absolute;
      inset: 0;
      border: 4px solid var(--primary-color);
      pointer-events: none;
      z-index: 1;
      box-sizing: border-box;
    }

    &__selection {
      position: absolute;
      z-index: 2;
      pointer-events: none;
    }

    &__preview {
      position: absolute;
      inset: 0;
      border: 2px solid var(--primary-color);
      background: rgba(var(--bg-primary-rgb), 0.08);
      overflow: hidden;
      pointer-events: auto;
      cursor: crosshair;

      &--move {
        cursor: move;
      }

      &--draw {
        cursor: crosshair;
      }

      &--text {
        cursor: text;
      }

      &--creating {
        pointer-events: none;
        background: transparent;
      }
    }

    &__canvas {
      position: relative;
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    &__handle {
      position: absolute;
      width: 10px;
      height: 10px;
      border: 2px solid var(--primary-color);
      border-radius: 50%;
      background: var(--bg-primary-color);
      pointer-events: auto;
      z-index: 3;

      &--n {
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        cursor: ns-resize;
      }

      &--s {
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        cursor: ns-resize;
      }

      &--e {
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
        cursor: ew-resize;
      }

      &--w {
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        cursor: ew-resize;
      }

      &--ne {
        top: -5px;
        right: -5px;
        cursor: nesw-resize;
      }

      &--nw {
        top: -5px;
        left: -5px;
        cursor: nwse-resize;
      }

      &--se {
        bottom: -5px;
        right: -5px;
        cursor: nwse-resize;
      }

      &--sw {
        bottom: -5px;
        left: -5px;
        cursor: nesw-resize;
      }
    }

    &__selection-bar {
      position: absolute;
      z-index: 4;
      pointer-events: auto;
    }

    &__toolbar {
      position: absolute;
      z-index: 4;
      pointer-events: auto;
    }
  }
</style>
