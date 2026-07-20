<template>
  <div class="img-viewer">
    <ToolBar class="img-viewer__toolbar" @maximized="(is) => (isMaximized = is)">
      <div class="flex-1" />
      <div class="flex">
        <SvgIconButton href="#minimize" @click="minimizeCurrentWindow" />
        <SvgIconButton
          :href="isMaximized ? '#restore' : '#maximize'"
          @click="() => restoreOrMaximizeCurrentWindow().then((v) => (isMaximized = !v))" />
        <SvgIconButton href="#close" hover-bg="var(--red)" hover-color="#FFF" @click="hideCurrentWindow" />
      </div>
    </ToolBar>

    <div v-if="currentImage" class="img-viewer__body">
      <div class="img-viewer__stage-wrap">
        <button
          v-if="canGoPrev"
          type="button"
          class="img-viewer__nav img-viewer__nav--prev"
          :title="t('imgViewer.prev')"
          @click="goPrev">
          <svg class="img-viewer__nav-icon">
            <use href="#left-arrow" />
          </svg>
        </button>

        <div
          ref="stageRef"
          class="img-viewer__stage"
          :class="{
            'img-viewer__stage--dragging': isDragging,
            'img-viewer__stage--pannable': canPan
          }"
          @wheel.prevent="onWheel"
          @mousedown="onDragStart"
          @mousemove="onDragMove"
          @mouseup="onDragEnd">
          <img
            ref="imageRef"
            class="img-viewer__image"
            :class="{
              'img-viewer__image--dragging': isDragging,
              'img-viewer__image--no-transition': disableTransition
            }"
            :src="currentImage.url"
            :alt="currentImage.name"
            :style="imageStyle"
            draggable="false"
            @load="onImageLoad" />
        </div>

        <button
          v-if="canGoNext"
          type="button"
          class="img-viewer__nav img-viewer__nav--next"
          :title="t('imgViewer.next')"
          @click="goNext">
          <svg class="img-viewer__nav-icon">
            <use href="#right-arrow" />
          </svg>
        </button>
      </div>

      <div class="img-viewer__bottom-bar">
        <div class="img-viewer__toolbar-group">
          <n-tooltip placement="top" :show-arrow="false">
            <template #trigger>
              <SvgIconButton
                href="#zoom-out"
                :size="36"
                icon-size="18px"
                color="#fff"
                hover-color="#fff"
                hover-bg="rgba(255, 255, 255, 0.12)"
                :disabled="scale <= MIN_SCALE"
                @click="zoomOut" />
            </template>
            {{ t('imgViewer.zoomOut') }}
          </n-tooltip>

          <span class="img-viewer__scale">{{ scalePercent }}%</span>

          <n-tooltip placement="top" :show-arrow="false">
            <template #trigger>
              <SvgIconButton
                href="#zoom-in"
                :size="36"
                icon-size="18px"
                color="#fff"
                hover-color="#fff"
                hover-bg="rgba(255, 255, 255, 0.12)"
                :disabled="scale >= MAX_SCALE"
                @click="zoomIn" />
            </template>
            {{ t('imgViewer.zoomIn') }}
          </n-tooltip>

          <span class="img-viewer__divider" />

          <n-tooltip placement="top" :show-arrow="false">
            <template #trigger>
              <SvgIconButton
                href="#scale-original"
                :size="36"
                icon-size="18px"
                color="#fff"
                hover-color="#fff"
                hover-bg="rgba(255, 255, 255, 0.12)"
                @click="resetTransform" />
            </template>
            {{ t('imgViewer.resetScale') }}
          </n-tooltip>

          <n-tooltip placement="top" :show-arrow="false">
            <template #trigger>
              <SvgIconButton
                href="#rotate"
                :size="36"
                icon-size="18px"
                color="#fff"
                hover-color="#fff"
                hover-bg="rgba(255, 255, 255, 0.12)"
                @click="rotate" />
            </template>
            {{ t('imgViewer.rotate') }}
          </n-tooltip>

          <span class="img-viewer__divider" />

          <n-tooltip placement="top" :show-arrow="false">
            <template #trigger>
              <SvgIconButton
                href="#download"
                :size="36"
                icon-size="18px"
                color="#fff"
                hover-color="#fff"
                hover-bg="rgba(255, 255, 255, 0.12)"
                :disabled="saving"
                @click="onSaveAs" />
            </template>
            {{ t('imgViewer.saveAs') }}
          </n-tooltip>
        </div>
      </div>
    </div>

    <div v-else class="img-viewer__empty">
      <LinyuEmpty :description="t('imgViewer.empty')" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { save } from '@tauri-apps/plugin-dialog'
  import { writeFile } from '@tauri-apps/plugin-fs'
  import { useI18n } from 'vue-i18n'
  import { useImgViewerStore } from '@/stores/viewer/imgViewer'
  import {
    hideCurrentWindow,
    minimizeCurrentWindow,
    restoreOrMaximizeCurrentWindow,
    ShowCurrentWindow
  } from '@/utils/desktop/window'

  const { t } = useI18n()
  const imgViewerStore = useImgViewerStore()
  const isMaximized = ref(false)

  const MIN_SCALE = 0.1
  const MAX_SCALE = 5
  const SCALE_STEP = 0.25

  const scale = ref(1)
  const rotation = ref(0)
  const offsetX = ref(0)
  const offsetY = ref(0)
  const saving = ref(false)
  const isDragging = ref(false)
  const disableTransition = ref(false)
  const stageRef = ref<HTMLElement | null>(null)
  const imageRef = ref<HTMLImageElement | null>(null)
  const layoutVersion = ref(0)

  let dragStartX = 0
  let dragStartY = 0
  let dragOriginX = 0
  let dragOriginY = 0
  let resizeObserver: ResizeObserver | null = null

  interface PanBounds {
    canPan: boolean
    minX: number
    maxX: number
    minY: number
    maxY: number
  }

  const currentImage = computed(() => imgViewerStore.images[imgViewerStore.currentIndex])
  const canGoPrev = computed(() => imgViewerStore.currentIndex > 0)
  const canGoNext = computed(() => imgViewerStore.currentIndex < imgViewerStore.images.length - 1)
  const scalePercent = computed(() => Math.round(scale.value * 100))

  const getPanBounds = (): PanBounds => {
    const stage = stageRef.value
    const image = imageRef.value
    if (!stage || !image) {
      return { canPan: false, minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const fitWidth = image.offsetWidth
    const fitHeight = image.offsetHeight
    if (!fitWidth || !fitHeight) {
      return { canPan: false, minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }

    const stageWidth = stage.clientWidth
    const stageHeight = stage.clientHeight
    const rad = (rotation.value * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))
    const scaledWidth = scale.value * (fitWidth * cos + fitHeight * sin)
    const scaledHeight = scale.value * (fitWidth * sin + fitHeight * cos)
    const overflowX = Math.max(0, (scaledWidth - stageWidth) / 2)
    const overflowY = Math.max(0, (scaledHeight - stageHeight) / 2)

    return {
      canPan: overflowX > 0 || overflowY > 0,
      minX: -overflowX,
      maxX: overflowX,
      minY: -overflowY,
      maxY: overflowY
    }
  }

  const canPan = computed(() => {
    void layoutVersion.value
    return getPanBounds().canPan
  })

  const bumpLayout = () => {
    layoutVersion.value += 1
  }

  const clampOffset = (x: number, y: number) => {
    const bounds = getPanBounds()
    if (!bounds.canPan) {
      return { x: 0, y: 0 }
    }

    return {
      x: bounds.maxX > 0 ? Math.min(bounds.maxX, Math.max(bounds.minX, x)) : 0,
      y: bounds.maxY > 0 ? Math.min(bounds.maxY, Math.max(bounds.minY, y)) : 0
    }
  }

  const applyOffsetClamp = () => {
    const clamped = clampOffset(offsetX.value, offsetY.value)
    offsetX.value = clamped.x
    offsetY.value = clamped.y
  }

  const imageStyle = computed(() => ({
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`
  }))

  const resetTransform = () => {
    disableTransition.value = true
    scale.value = 1
    rotation.value = 0
    offsetX.value = 0
    offsetY.value = 0
    nextTick(() => {
      disableTransition.value = false
    })
  }

  const onDragStart = (event: MouseEvent) => {
    if (event.button !== 0 || !getPanBounds().canPan) return

    isDragging.value = true
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragOriginX = offsetX.value
    dragOriginY = offsetY.value
  }

  const onDragMove = (event: MouseEvent) => {
    if (!isDragging.value) return

    const clamped = clampOffset(dragOriginX + event.clientX - dragStartX, dragOriginY + event.clientY - dragStartY)
    offsetX.value = clamped.x
    offsetY.value = clamped.y
  }

  const onDragEnd = () => {
    isDragging.value = false
  }

  const onWindowMouseMove = (event: MouseEvent) => {
    onDragMove(event)
  }

  const onWindowMouseUp = () => {
    onDragEnd()
  }

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))

  const zoomIn = () => {
    scale.value = clampScale(Number((scale.value + SCALE_STEP).toFixed(2)))
    applyOffsetClamp()
  }

  const zoomOut = () => {
    scale.value = clampScale(Number((scale.value - SCALE_STEP).toFixed(2)))
    applyOffsetClamp()
  }

  const rotate = () => {
    rotation.value += 90
    applyOffsetClamp()
  }

  const goPrev = () => {
    if (!canGoPrev.value) return
    imgViewerStore.setCurrentIndex(imgViewerStore.currentIndex - 1)
    resetTransform()
  }

  const goNext = () => {
    if (!canGoNext.value) return
    imgViewerStore.setCurrentIndex(imgViewerStore.currentIndex + 1)
    resetTransform()
  }

  const onWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) {
      zoomIn()
    } else if (event.deltaY > 0) {
      zoomOut()
    }
  }

  const onImageLoad = () => {
    resetTransform()
    nextTick(() => {
      bumpLayout()
      applyOffsetClamp()
    })
  }

  const setupResizeObserver = () => {
    resizeObserver?.disconnect()
    if (!stageRef.value) return

    resizeObserver = new ResizeObserver(() => {
      bumpLayout()
      applyOffsetClamp()
    })
    resizeObserver.observe(stageRef.value)
  }

  const getDefaultFileName = (name: string, url: string) => {
    if (name) return name

    const urlPath = url.split('?')[0]
    const fileName = urlPath.split('/').pop()
    return fileName || 'image.png'
  }

  const onSaveAs = () => {
    const image = currentImage.value
    if (!image || saving.value) return

    const defaultName = getDefaultFileName(image.name, image.url)

    save({
      defaultPath: defaultName,
      filters: [
        {
          name: 'Image',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
        }
      ]
    }).then((filePath) => {
      if (!filePath) return

      saving.value = true
      fetch(image.url)
        .then((response) => response.arrayBuffer())
        .then((buffer) => writeFile(filePath, new Uint8Array(buffer)))
        .then(() => {
          window.$message.success(t('imgViewer.saveSuccess'))
        })
        .catch(() => {
          window.$message.error(t('imgViewer.saveFailed'))
        })
        .finally(() => {
          saving.value = false
        })
    })
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideCurrentWindow()
      return
    }

    if (event.key === 'ArrowLeft') {
      goPrev()
      return
    }

    if (event.key === 'ArrowRight') {
      goNext()
      return
    }

    if (event.key === '+' || event.key === '=') {
      zoomIn()
      return
    }

    if (event.key === '-') {
      zoomOut()
    }
  }

  watch(
    () => currentImage.value?.url,
    () => {
      nextTick(() => {
        bumpLayout()
        setupResizeObserver()
      })
    },
    { immediate: true }
  )

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup', onWindowMouseUp)
    nextTick(() => {
      ShowCurrentWindow()
    })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('mousemove', onWindowMouseMove)
    window.removeEventListener('mouseup', onWindowMouseUp)
    resizeObserver?.disconnect()
  })
</script>

<style scoped lang="scss">
  .img-viewer {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary-color);
    color: var(--text-color);
    overflow: hidden;
    user-select: none;

    &__toolbar {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      height: 38px;
      padding: 0 3px;
    }

    &__body {
      position: relative;
      flex: 1;
      min-height: 0;
    }

    &__stage-wrap {
      position: relative;
      height: 100%;
      padding: 5px 5px 62px 5px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &__stage {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: default;

      &--pannable {
        cursor: grab;
      }

      &--dragging {
        cursor: grabbing;
      }
    }

    &__image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      transition: transform 0.15s ease;
      will-change: transform;

      &--dragging,
      &--no-transition {
        transition: none;
      }
    }

    &__nav {
      position: absolute;
      top: 50%;
      z-index: 2;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      cursor: pointer;
      transition: background-color 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.65);
      }

      &--prev {
        left: 24px;
      }

      &--next {
        right: 24px;
      }
    }

    &__nav-icon {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    &__bottom-bar {
      position: absolute;
      left: 50%;
      bottom: 5px;
      transform: translateX(-50%);
      z-index: 2;
      padding: 8px 14px;
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(8px);
    }

    &__toolbar-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    &__scale {
      min-width: 44px;
      text-align: center;
      font-size: 13px;
      color: #fff;
    }

    &__divider {
      width: 1px;
      height: 20px;
      margin: 0 4px;
      background: rgba(255, 255, 255, 0.2);
    }

    &__empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
