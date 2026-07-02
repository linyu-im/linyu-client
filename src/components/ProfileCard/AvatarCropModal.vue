<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    :close-on-esc="false"
    transform-origin="center"
    @after-leave="resetState">
    <div class="avatar-crop">
      <div class="avatar-crop__header">
        <span class="avatar-crop__title">{{ t('avatarCrop.title') }}</span>
        <button type="button" class="avatar-crop__close" @click="onClose">
          <svg class="size-18px"><use href="#close" /></svg>
        </button>
      </div>

      <div
        ref="stageRef"
        class="avatar-crop__stage"
        :class="{ 'avatar-crop__stage--dragging': dragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="onPointerUp"
        @wheel="onWheel">
        <img
          v-if="imageSrc"
          ref="imageRef"
          class="avatar-crop__image"
          :src="imageSrc"
          draggable="false"
          :style="imageStyle"
          @load="onImageLoad"
          @error="onImageError" />
        <div class="avatar-crop__mask" :style="maskStyle" />
      </div>

      <div class="avatar-crop__zoom">
        <button type="button" class="avatar-crop__zoom-btn" @click="adjustZoom(-zoomStep)">
          <svg class="size-18px"><use href="#zoom-out" /></svg>
        </button>
        <n-slider
          v-model:value="zoom"
          class="avatar-crop__slider"
          :min="minZoom"
          :max="maxZoom"
          :step="zoomStep"
          :tooltip="false"
          @update:value="onZoomChange" />
        <button type="button" class="avatar-crop__zoom-btn" @click="adjustZoom(zoomStep)">
          <svg class="size-18px"><use href="#zoom-in" /></svg>
        </button>
      </div>

      <div class="avatar-crop__footer">
        <n-button type="primary" round :loading="saving" :disabled="!imageReady" @click="onSave">
          {{ t('avatarCrop.save') }}
        </n-button>
        <n-button round @click="onCancel">
          {{ t('avatarCrop.cancel') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { readFile } from '@tauri-apps/plugin-fs'
  import { useI18n } from 'vue-i18n'

  const IMAGE_MIME_BY_EXT: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp'
  }

  const visible = defineModel<boolean>('show', { default: false })

  const props = defineProps<{
    filePath: string
  }>()

  const emit = defineEmits<{
    save: [blob: Blob]
  }>()

  const { t } = useI18n()

  const viewportSize = 280
  const cropSize = 220
  const cropHalf = cropSize / 2
  const outputSize = 512
  const minZoom = 1
  const maxZoom = 3
  const zoomStep = 0.01

  const stageRef = ref<HTMLElement | null>(null)
  const imageRef = ref<HTMLImageElement | null>(null)
  const imageSrc = ref('')
  const baseScale = ref(1)
  const zoom = ref(1)
  const offsetX = ref(0)
  const offsetY = ref(0)
  const dragging = ref(false)
  const saving = ref(false)
  const imageReady = ref(false)
  const naturalSize = ref({ width: 0, height: 0 })

  let dragStartX = 0
  let dragStartY = 0
  let dragOriginX = 0
  let dragOriginY = 0
  let activePointerId: number | null = null
  let imageObjectUrl = ''
  let sourceBitmap: ImageBitmap | null = null

  const showError = (key: 'avatarCrop.cropFailed' | 'avatarCrop.loadFailed') => {
    nextTick(() => {
      window.$message.error(t(key))
    })
  }

  const disposeSourceBitmap = () => {
    sourceBitmap?.close()
    sourceBitmap = null
  }

  const getNaturalSize = () => {
    if (naturalSize.value.width && naturalSize.value.height) {
      return naturalSize.value
    }
    const image = imageRef.value
    return { width: image?.naturalWidth ?? 0, height: image?.naturalHeight ?? 0 }
  }

  const currentScale = computed(() => baseScale.value * zoom.value)

  const imageStyle = computed(() => {
    const { width, height } = naturalSize.value.width
      ? naturalSize.value
      : {
          width: imageRef.value?.naturalWidth ?? 0,
          height: imageRef.value?.naturalHeight ?? 0
        }
    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(calc(-50% + ${offsetX.value}px), calc(-50% + ${offsetY.value}px)) scale(${currentScale.value})`
    }
  })

  const maskStyle = computed(() => ({
    width: `${cropSize}px`,
    height: `${cropSize}px`
  }))

  const getDisplaySize = () => {
    const { width, height } = getNaturalSize()
    if (!width || !height) {
      return { width: 0, height: 0 }
    }
    const scale = currentScale.value
    return {
      width: width * scale,
      height: height * scale
    }
  }

  const clampOffset = () => {
    const { width, height } = getDisplaySize()
    if (!width || !height) return

    const maxOffsetX = Math.max(0, (width - cropSize) / 2)
    const maxOffsetY = Math.max(0, (height - cropSize) / 2)
    offsetX.value = Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX.value))
    offsetY.value = Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY.value))
  }

  const initCropFromSize = (width: number, height: number) => {
    if (!width || !height) return

    naturalSize.value = { width, height }
    imageReady.value = true
    baseScale.value = Math.max(cropSize / width, cropSize / height)
    zoom.value = 1
    offsetX.value = 0
    offsetY.value = 0
    clampOffset()
  }

  const onImageLoad = () => {
    if (imageReady.value) return
    const { width, height } = getNaturalSize()
    initCropFromSize(width, height)
  }

  const onImageError = () => {
    imageReady.value = false
    showError('avatarCrop.loadFailed')
  }

  const onZoomChange = () => {
    clampOffset()
  }

  const adjustZoom = (delta: number) => {
    const next = Math.min(maxZoom, Math.max(minZoom, zoom.value + delta))
    zoom.value = Number(next.toFixed(2))
    clampOffset()
  }

  const onWheel = (event: WheelEvent) => {
    if (!imageSrc.value) return
    event.preventDefault()

    const rect = stageRef.value?.getBoundingClientRect()
    if (!rect) return

    const delta = -event.deltaY * 0.001
    const oldZoom = zoom.value
    const nextZoom = Math.min(maxZoom, Math.max(minZoom, oldZoom + delta))
    if (nextZoom === oldZoom) return

    const mx = event.clientX - rect.left - viewportSize / 2
    const my = event.clientY - rect.top - viewportSize / 2
    const ratio = nextZoom / oldZoom

    offsetX.value = mx - (mx - offsetX.value) * ratio
    offsetY.value = my - (my - offsetY.value) * ratio
    zoom.value = Number(nextZoom.toFixed(2))
    clampOffset()
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!imageSrc.value || event.button !== 0) return
    dragging.value = true
    activePointerId = event.pointerId
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragOriginX = offsetX.value
    dragOriginY = offsetY.value
    stageRef.value?.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging.value || activePointerId !== event.pointerId) return
    offsetX.value = dragOriginX + event.clientX - dragStartX
    offsetY.value = dragOriginY + event.clientY - dragStartY
    clampOffset()
  }

  const onPointerUp = (event: PointerEvent) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) return
    dragging.value = false
    activePointerId = null
    stageRef.value?.releasePointerCapture(event.pointerId)
  }

  const getImageMime = (path: string) => {
    const ext = path.split(/[/\\]/).pop()?.split('.').pop()?.toLowerCase() ?? ''
    return IMAGE_MIME_BY_EXT[ext] ?? 'image/jpeg'
  }

  const revokeImageObjectUrl = () => {
    if (!imageObjectUrl) return
    URL.revokeObjectURL(imageObjectUrl)
    imageObjectUrl = ''
  }

  const loadImage = (path: string) => {
    revokeImageObjectUrl()
    disposeSourceBitmap()
    imageReady.value = false

    if (!path) {
      imageSrc.value = ''
      return
    }

    readFile(path)
      .then((bytes) => {
        const mime = getImageMime(path)
        const blob = new Blob([new Uint8Array(bytes)], { type: mime })
        return createImageBitmap(blob)
          .then((bitmap) => {
            disposeSourceBitmap()
            sourceBitmap = bitmap
            revokeImageObjectUrl()
            imageObjectUrl = URL.createObjectURL(blob)
            imageSrc.value = imageObjectUrl
            initCropFromSize(bitmap.width, bitmap.height)
          })
          .catch(() => {
            revokeImageObjectUrl()
            imageObjectUrl = URL.createObjectURL(blob)
            imageSrc.value = imageObjectUrl
          })
      })
      .catch(() => {
        imageSrc.value = ''
        showError('avatarCrop.loadFailed')
      })
  }

  const resetState = () => {
    revokeImageObjectUrl()
    disposeSourceBitmap()
    imageSrc.value = ''
    imageReady.value = false
    naturalSize.value = { width: 0, height: 0 }
    baseScale.value = 1
    zoom.value = 1
    offsetX.value = 0
    offsetY.value = 0
    dragging.value = false
    saving.value = false
    activePointerId = null
  }

  const canvasToJpegBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result)
            return
          }

          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
            const base64 = dataUrl.split(',')[1]
            if (!base64) {
              reject(new Error('blob export failed'))
              return
            }
            const binary = atob(base64)
            const output = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
              output[i] = binary.charCodeAt(i)
            }
            resolve(new Blob([output], { type: 'image/jpeg' }))
          } catch (error) {
            reject(error instanceof Error ? error : new Error('blob export failed'))
          }
        },
        'image/jpeg',
        0.92
      )
    })
  }

  const exportCroppedBlob = async () => {
    const { width: naturalWidth, height: naturalHeight } = getNaturalSize()
    if (!naturalWidth || !naturalHeight) {
      throw new Error('image not ready')
    }

    const scale = currentScale.value
    const displayWidth = naturalWidth * scale
    const displayHeight = naturalHeight * scale
    const centerX = viewportSize / 2 + offsetX.value
    const centerY = viewportSize / 2 + offsetY.value
    const imageLeft = centerX - displayWidth / 2
    const imageTop = centerY - displayHeight / 2
    const cropLeft = viewportSize / 2 - cropHalf
    const cropTop = viewportSize / 2 - cropHalf

    const sourceX = (cropLeft - imageLeft) / scale
    const sourceY = (cropTop - imageTop) / scale
    const sourceSize = cropSize / scale

    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('canvas unavailable')
    }

    const drawSource = sourceBitmap ?? imageRef.value
    if (!drawSource) {
      throw new Error('image not ready')
    }

    ctx.drawImage(drawSource, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize)

    return canvasToJpegBlob(canvas)
  }

  const onClose = () => {
    visible.value = false
  }

  const onCancel = () => {
    onClose()
  }

  const onSave = () => {
    if (saving.value) return
    saving.value = true
    exportCroppedBlob()
      .then((blob) => {
        emit('save', blob)
        visible.value = false
      })
      .catch(() => {
        showError('avatarCrop.cropFailed')
      })
      .finally(() => {
        saving.value = false
      })
  }

  watch(
    () => [visible.value, props.filePath] as const,
    ([show, path]) => {
      if (show && path) {
        loadImage(path)
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    revokeImageObjectUrl()
    disposeSourceBitmap()
  })
</script>

<style scoped lang="scss">
  .avatar-crop {
    display: flex;
    flex-direction: column;
    width: 360px;
    max-width: 92vw;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    overflow: hidden;

    &__header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 0 48px;
      border-bottom: 1px solid var(--divider-color);
    }

    &__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__close {
      position: absolute;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--text-color);
      }
    }

    &__stage {
      position: relative;
      width: 280px;
      height: 280px;
      margin: 24px auto 0;
      overflow: hidden;
      touch-action: none;
      cursor: grab;
      background: var(--bg-secondary-color);

      &--dragging {
        cursor: grabbing;
      }
    }

    &__image {
      position: absolute;
      top: 50%;
      left: 50%;
      transform-origin: center center;
      user-select: none;
      pointer-events: none;
      max-width: none;
    }

    &__mask {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 2px;
      box-shadow: 0 0 0 9999px color-mix(in srgb, var(--bg-secondary-color) 72%, transparent);
      pointer-events: none;
    }

    &__zoom {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 20px 24px 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--bg-secondary-color);
    }

    &__zoom-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--text-color);
      }
    }

    &__slider {
      flex: 1;
      min-width: 0;
    }

    &__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px 24px;
    }
  }
</style>
