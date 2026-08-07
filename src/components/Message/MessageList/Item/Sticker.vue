<template>
  <div class="message-sticker-wrap" :style="wrapStyle">
    <div v-if="showPlaceholder" class="message-sticker__placeholder" aria-hidden="true" />
    <img
      v-if="displaySrc"
      class="message-sticker"
      :src="displaySrc"
      :alt="content.stickerName"
      draggable="false"
      @load="onStickerLoad"
      @error="onStickerError" />
  </div>
</template>

<script setup lang="ts">
  import { exists } from '@tauri-apps/plugin-fs'
  import type { StickerContent, StickerMessageLocalExt } from '@/types/api/message'
  import {
    readLocalFileAsObjectUrl,
    resolveLocalMediaDisplayUrl,
    resolveLocalMediaFilePath,
    toLocalFileDisplayUrl
  } from '@/utils/file/blobFilePath'
  import {
    downloadMessageToStorage,
    findExistingStickerPath,
    resolveMessageStorageRoot
  } from '@/utils/message/messageFileSave'
  import { mergeMediaMessageLocalExt } from '@/utils/message/messageLocalExt'
  import {
    calcStickerDisplaySize,
    DEFAULT_STICKER_SIZE,
    getMediaDisplaySizeFromLocalExt,
    hasSameDisplaySize
  } from '@/utils/message/messageMediaLayout'
  import {
    cropStickerFile,
    cropStickerImage,
    isAnimatedMediaName,
    type StickerContentBox
  } from '@/utils/message/stickerCrop'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { preloadMediaDisplaySrc } from '@/utils/message/mediaDisplaySrc'

  const props = defineProps<{
    messageId: string
    content: StickerContent
    localExt?: StickerMessageLocalExt
  }>()

  const appSettingsStore = useAppSettingsStore()
  const messageDbStore = useMessageDbStore()

  const receivedLocalExt = ref<StickerMessageLocalExt>()
  const displaySrc = ref('')
  const stickerReady = ref(false)
  const stickerError = ref(false)
  const cacheInFlight = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  const displayWidth = ref(DEFAULT_STICKER_SIZE.displayWidth)
  const displayHeight = ref(DEFAULT_STICKER_SIZE.displayHeight)
  let assetFallbackAttempted = false
  /** 当前 displaySrc 是否为裁剪后的内容图，避免裁剪图加载再次触发测量裁剪 */
  let croppedApplied = false

  const stickerLocalExt = computed(() => receivedLocalExt.value ?? props.localExt)

  const wrapStyle = computed(() => ({
    width: `${displayWidth.value}px`,
    height: `${displayHeight.value}px`
  }))

  const showPlaceholder = computed(() => stickerError.value)

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const normalizedStickerId = computed(() => {
    const raw = props.content.stickerId
    if (raw == null) return ''
    return String(raw).trim()
  })

  const isAnimatedSticker = () =>
    isAnimatedMediaName(props.content.stickerName) || isAnimatedMediaName(props.content.stickerUrl)

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const applyLayoutFromLocalExt = (localExt?: StickerMessageLocalExt) => {
    const size = getMediaDisplaySizeFromLocalExt(localExt)
    if (!size) return
    if (stickerReady.value && displayWidth.value === size.displayWidth && displayHeight.value === size.displayHeight) {
      return
    }
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
  }

  const persistLocalExt = (patch: Partial<StickerMessageLocalExt>) => {
    const merged = mergeMediaMessageLocalExt(stickerLocalExt.value, patch)
    receivedLocalExt.value = merged
    void messageDbStore.updateStickerMessageLocalExt(props.messageId, merged)
  }

  const persistDisplaySize = (naturalW: number, naturalH: number) => {
    const size = calcStickerDisplaySize(naturalW, naturalH)
    const sizeUnchanged = displayWidth.value === size.displayWidth && displayHeight.value === size.displayHeight
    if (sizeUnchanged) {
      if (!hasSameDisplaySize(stickerLocalExt.value, size)) persistLocalExt(size)
      return
    }
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
    if (hasSameDisplaySize(stickerLocalExt.value, size)) return
    persistLocalExt(size)
  }

  const readCachedContentBox = (): StickerContentBox | undefined => {
    const ext = stickerLocalExt.value
    if (ext?.contentX != null && ext.contentY != null && ext.contentWidth != null && ext.contentHeight != null) {
      return {
        x: ext.contentX,
        y: ext.contentY,
        width: ext.contentWidth,
        height: ext.contentHeight,
        sourceWidth: 0,
        sourceHeight: 0
      }
    }
    return undefined
  }

  const hasSameContentBox = (box: StickerContentBox) => {
    const ext = stickerLocalExt.value
    return (
      ext?.contentX === box.x &&
      ext?.contentY === box.y &&
      ext?.contentWidth === box.width &&
      ext?.contentHeight === box.height
    )
  }

  const applyContentSize = (box: StickerContentBox) => {
    const size = calcStickerDisplaySize(box.width, box.height)
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
  }

  const persistContentBox = (box: StickerContentBox) => {
    if (hasSameContentBox(box)) return
    const size = calcStickerDisplaySize(box.width, box.height)
    persistLocalExt({
      contentX: box.x,
      contentY: box.y,
      contentWidth: box.width,
      contentHeight: box.height,
      displayWidth: size.displayWidth,
      displayHeight: size.displayHeight
    })
  }

  const tryCropFromLocalPath = async (localPath: string) => {
    if (isAnimatedSticker()) return null
    try {
      const cropped = await cropStickerFile(localPath, readCachedContentBox())
      if (!cropped) return null
      persistContentBox(cropped.box)
      return cropped
    } catch {
      return null
    }
  }

  const findSharedStickerCachePath = (storageRoot: string) => {
    const stickerId = normalizedStickerId.value
    if (!stickerId) return Promise.resolve(null)
    return findExistingStickerPath(storageRoot, stickerId)
  }

  const cacheRemoteSticker = () => {
    const stickerId = normalizedStickerId.value
    if (!props.content.stickerUrl || !stickerId || cacheInFlight.value) return Promise.resolve()

    cacheInFlight.value = true
    return resolveMessageStorageRoot(appSettingsStore.storage.path)
      .then((storageRoot) =>
        downloadMessageToStorage({
          storageRoot,
          sourceUrl: props.content.stickerUrl,
          category: 'sticker',
          stickerId,
          fileName: props.content.stickerName,
          defaultExtension: '.png'
        })
      )
      .then((localPath) => {
        if (normalizedStickerId.value !== stickerId) return
        persistLocalExt({ localPath })
        void tryCropFromLocalPath(localPath).then((cropped) => {
          if (!cropped || normalizedStickerId.value !== stickerId) return
          applyContentSize(cropped.box)
          croppedApplied = true
          applyDisplaySrc(cropped.url, localPath)
        })
      })
      .catch((error) => {
        console.error('[sticker] cache failed', {
          messageId: props.messageId,
          stickerId,
          stickerUrl: props.content.stickerUrl,
          error
        })
      })
      .finally(() => {
        cacheInFlight.value = false
      })
  }

  const scheduleStickerCache = () => {
    if (currentLocalPath.value || !normalizedStickerId.value || !props.content.stickerUrl) return
    if (cacheInFlight.value) return
    void cacheRemoteSticker()
  }

  const applyDisplaySrc = (nextSrc: string, localPath = '') => {
    if (displaySrc.value === nextSrc) {
      if (localPath) currentLocalPath.value = localPath
      return
    }

    const commitSwap = () => {
      stickerError.value = false
      currentLocalPath.value = localPath
      assetFallbackAttempted = false
      if (!localPath) revokeBlobObjectUrl()
      displaySrc.value = nextSrc
    }

    const deferred = preloadMediaDisplaySrc(displaySrc.value, nextSrc, stickerReady.value, () => {
      commitSwap()
      stickerReady.value = true
    })

    if (!deferred) {
      stickerReady.value = false
      commitSwap()
    }
  }

  const syncDisplaySrc = () => {
    const run = async () => {
      applyLayoutFromLocalExt(stickerLocalExt.value)

      const storageRoot = await resolveMessageStorageRoot(appSettingsStore.storage.path)

      const localPath = stickerLocalExt.value?.localPath
      if (localPath && (await exists(localPath))) {
        const cropped = await tryCropFromLocalPath(localPath)
        if (cropped) {
          applyContentSize(cropped.box)
          croppedApplied = true
          applyDisplaySrc(cropped.url, localPath)
        } else {
          applyDisplaySrc(toLocalFileDisplayUrl(localPath), localPath)
        }
        return
      }

      const sharedPath = await findSharedStickerCachePath(storageRoot)
      if (sharedPath) {
        persistLocalExt({ localPath: sharedPath })
        const cropped = await tryCropFromLocalPath(sharedPath)
        if (cropped) {
          applyContentSize(cropped.box)
          croppedApplied = true
          applyDisplaySrc(cropped.url, sharedPath)
        } else {
          applyDisplaySrc(toLocalFileDisplayUrl(sharedPath), sharedPath)
        }
        return
      }

      if (isLocalPendingUrl(props.content.stickerUrl)) {
        applyDisplaySrc(resolveLocalMediaDisplayUrl(props.content.stickerUrl))
        return
      }

      applyDisplaySrc(props.content.stickerUrl)

      scheduleStickerCache()
    }

    void run()
  }

  const tryCropLoadedImage = (image: HTMLImageElement) => {
    const stickerId = normalizedStickerId.value
    void cropStickerImage(image)
      .then((cropped) => {
        if (normalizedStickerId.value !== stickerId) return
        if (!cropped) {
          persistDisplaySize(image.naturalWidth, image.naturalHeight)
          return
        }
        applyContentSize(cropped.box)
        persistContentBox(cropped.box)
        croppedApplied = true
        applyDisplaySrc(cropped.url, currentLocalPath.value)
        stickerReady.value = true
      })
      .catch(() => {
        if (normalizedStickerId.value !== stickerId) return
        persistDisplaySize(image.naturalWidth, image.naturalHeight)
      })
  }

  const resetMediaState = () => {
    receivedLocalExt.value = undefined
    cacheInFlight.value = false
    displayWidth.value = DEFAULT_STICKER_SIZE.displayWidth
    displayHeight.value = DEFAULT_STICKER_SIZE.displayHeight
    croppedApplied = false
  }

  watch(
    () => `${normalizedStickerId.value}|${props.content.stickerUrl}`,
    (_identity, prevIdentity) => {
      if (prevIdentity === undefined) return
      resetMediaState()
    }
  )

  watch(
    () => props.messageId,
    (newId, oldId) => {
      if (!oldId || newId === oldId) return
      const ext = receivedLocalExt.value ?? props.localExt
      if (ext) {
        void messageDbStore.updateStickerMessageLocalExt(newId, ext)
      }
    }
  )

  watch(() => [normalizedStickerId.value, props.content.stickerUrl, props.localExt] as const, syncDisplaySrc, {
    immediate: true
  })

  const onStickerLoad = (event: Event) => {
    const image = event.target as HTMLImageElement
    if (croppedApplied) {
      stickerReady.value = true
      stickerError.value = false
      scheduleStickerCache()
      return
    }
    if (isAnimatedSticker()) {
      persistDisplaySize(image.naturalWidth, image.naturalHeight)
      stickerReady.value = true
      stickerError.value = false
      scheduleStickerCache()
      return
    }
    stickerReady.value = true
    stickerError.value = false
    scheduleStickerCache()
    tryCropLoadedImage(image)
  }

  const onStickerError = () => {
    if (currentLocalPath.value && !assetFallbackAttempted) {
      assetFallbackAttempted = true
      readLocalFileAsObjectUrl(currentLocalPath.value)
        .then((url) => {
          revokeBlobObjectUrl()
          blobObjectUrl.value = url
          croppedApplied = false
          stickerReady.value = false
          displaySrc.value = url
        })
        .catch(() => {
          stickerReady.value = false
          stickerError.value = true
        })
      return
    }
    stickerReady.value = false
    stickerError.value = true
  }

  onBeforeUnmount(() => {
    revokeBlobObjectUrl()
  })
</script>

<style scoped lang="scss">
  .message-sticker-wrap {
    position: relative;
    box-sizing: border-box;
    line-height: 0;
    overflow: hidden;
  }

  .message-sticker__placeholder {
    position: absolute;
    inset: 0;
    border-radius: 6px;
    background: var(--bg-secondary-color);
  }

  .message-sticker {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }
</style>
