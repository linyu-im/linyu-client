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
    calcStickerContentDisplaySize,
    calcStickerDisplaySize,
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
  let assetFallbackAttempted = false
  /** 首次展示后锁定宽高，避免裁剪替换时尺寸/位置跳动 */
  let layoutLocked = false

  const stickerLocalExt = computed(() => receivedLocalExt.value ?? props.localExt)

  const resolveSizeFromExt = (localExt?: StickerMessageLocalExt) => {
    if (
      localExt?.contentWidth &&
      localExt.contentHeight &&
      localExt.sourceWidth &&
      localExt.sourceHeight &&
      localExt.sourceWidth > 0 &&
      localExt.sourceHeight > 0
    ) {
      return calcStickerContentDisplaySize({
        width: localExt.contentWidth,
        height: localExt.contentHeight,
        sourceWidth: localExt.sourceWidth,
        sourceHeight: localExt.sourceHeight
      })
    }
    return getMediaDisplaySizeFromLocalExt(localExt)
  }

  const initialSize = resolveSizeFromExt(props.localExt)
  const displayWidth = ref(initialSize?.displayWidth ?? 0)
  const displayHeight = ref(initialSize?.displayHeight ?? 0)

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

  const readCachedContentBox = (): StickerContentBox | undefined => {
    const ext = stickerLocalExt.value
    if (ext?.contentX != null && ext.contentY != null && ext.contentWidth != null && ext.contentHeight != null) {
      return {
        x: ext.contentX,
        y: ext.contentY,
        width: ext.contentWidth,
        height: ext.contentHeight,
        sourceWidth: ext.sourceWidth ?? 0,
        sourceHeight: ext.sourceHeight ?? 0
      }
    }
    return undefined
  }

  const applyLayoutFromLocalExt = (localExt?: StickerMessageLocalExt) => {
    if (layoutLocked) return
    const size = resolveSizeFromExt(localExt)
    if (!size) return
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
  }

  const persistLocalExt = (patch: Partial<StickerMessageLocalExt>) => {
    const merged = mergeMediaMessageLocalExt(stickerLocalExt.value, patch)
    receivedLocalExt.value = merged
    void messageDbStore.updateStickerMessageLocalExt(props.messageId, merged)
  }

  const persistDisplaySize = (naturalW: number, naturalH: number) => {
    if (layoutLocked) return
    const cachedBox = readCachedContentBox()
    const size =
      cachedBox && cachedBox.sourceWidth > 0 && cachedBox.sourceHeight > 0
        ? calcStickerContentDisplaySize(cachedBox)
        : calcStickerDisplaySize(naturalW, naturalH)
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
    layoutLocked = true
    if (!hasSameDisplaySize(stickerLocalExt.value, size)) persistLocalExt(size)
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
    if (layoutLocked) return
    const size = calcStickerContentDisplaySize(box)
    displayWidth.value = size.displayWidth
    displayHeight.value = size.displayHeight
    layoutLocked = true
  }

  const persistContentBox = (box: StickerContentBox) => {
    const size = calcStickerContentDisplaySize(box)
    if (
      hasSameContentBox(box) &&
      stickerLocalExt.value?.sourceWidth === box.sourceWidth &&
      stickerLocalExt.value?.sourceHeight === box.sourceHeight &&
      hasSameDisplaySize(stickerLocalExt.value, size)
    ) {
      return
    }
    persistLocalExt({
      contentX: box.x,
      contentY: box.y,
      contentWidth: box.width,
      contentHeight: box.height,
      sourceWidth: box.sourceWidth,
      sourceHeight: box.sourceHeight,
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
          persistContentBox(cropped.box)
          if (layoutLocked) return
          applyCroppedResult(cropped.url, localPath, cropped.box)
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

  const applyDisplaySrc = (nextSrc: string, localPath = '', onCommit?: () => void) => {
    if (displaySrc.value === nextSrc) {
      if (localPath) currentLocalPath.value = localPath
      onCommit?.()
      return
    }

    const commitSwap = () => {
      stickerError.value = false
      currentLocalPath.value = localPath
      assetFallbackAttempted = false
      if (!localPath) revokeBlobObjectUrl()
      displaySrc.value = nextSrc
      onCommit?.()
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

  const applyCroppedResult = (url: string, localPath: string, box: StickerContentBox) => {
    if (layoutLocked) {
      persistContentBox(box)
      return
    }
    persistContentBox(box)
    applyDisplaySrc(url, localPath, () => applyContentSize(box))
  }

  const cropFromDisplayUrl = (url: string) => {
    if (!url || isAnimatedSticker()) return Promise.resolve(null)
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      const isLocal = url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('asset:')
      if (!isLocal) image.crossOrigin = 'anonymous'
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('sticker decode failed'))
      image.src = url
    })
      .then((image) => cropStickerImage(image))
      .catch(() => null)
  }

  const syncDisplaySrc = () => {
    const run = async () => {
      if (layoutLocked) return
      applyLayoutFromLocalExt(stickerLocalExt.value)

      const storageRoot = await resolveMessageStorageRoot(appSettingsStore.storage.path)

      const localPath = stickerLocalExt.value?.localPath
      if (localPath && (await exists(localPath))) {
        const cropped = await tryCropFromLocalPath(localPath)
        if (cropped) {
          applyCroppedResult(cropped.url, localPath, cropped.box)
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
          applyCroppedResult(cropped.url, sharedPath, cropped.box)
        } else {
          applyDisplaySrc(toLocalFileDisplayUrl(sharedPath), sharedPath)
        }
        return
      }

      const pendingSrc = isLocalPendingUrl(props.content.stickerUrl)
        ? resolveLocalMediaDisplayUrl(props.content.stickerUrl)
        : props.content.stickerUrl

      if (!isAnimatedSticker()) {
        const cropped = await cropFromDisplayUrl(pendingSrc)
        if (cropped) {
          applyCroppedResult(cropped.url, '', cropped.box)
          scheduleStickerCache()
          return
        }
      }

      applyDisplaySrc(pendingSrc)
      scheduleStickerCache()
    }

    void run()
  }

  const resetMediaState = () => {
    receivedLocalExt.value = undefined
    cacheInFlight.value = false
    const size = resolveSizeFromExt(props.localExt)
    displayWidth.value = size?.displayWidth ?? 0
    displayHeight.value = size?.displayHeight ?? 0
    layoutLocked = false
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
    stickerReady.value = true
    stickerError.value = false
    if (!layoutLocked) {
      persistDisplaySize(image.naturalWidth, image.naturalHeight)
    }
    scheduleStickerCache()
  }

  const onStickerError = () => {
    if (currentLocalPath.value && !assetFallbackAttempted) {
      assetFallbackAttempted = true
      readLocalFileAsObjectUrl(currentLocalPath.value)
        .then((url) => {
          revokeBlobObjectUrl()
          blobObjectUrl.value = url
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
