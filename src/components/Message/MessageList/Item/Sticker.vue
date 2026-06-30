<template>
  <div class="message-sticker-wrap">
    <div v-if="showPlaceholder" class="message-sticker__placeholder" aria-hidden="true" />
    <img
      v-if="displaySrc"
      class="message-sticker"
      :class="{ 'message-sticker--hidden': !stickerReady }"
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
  } from '@/utils/blobFilePath'
  import { downloadMessageToStorage, findExistingStickerPath, resolveMessageStorageRoot } from '@/utils/messageFileSave'
  import { useAppSettingsStore } from '@/stores/appSettings'
  import { useMessageDbStore } from '@/stores/messageDb'

  const props = defineProps<{
    messageId: string
    content: StickerContent
    localExt?: StickerMessageLocalExt
  }>()

  const appSettingsStore = useAppSettingsStore()
  const messageDbStore = useMessageDbStore()

  const displaySrc = ref('')
  const stickerReady = ref(false)
  const stickerError = ref(false)
  const cacheInFlight = ref(false)
  const currentLocalPath = ref('')
  const blobObjectUrl = ref('')
  let assetFallbackAttempted = false

  const showPlaceholder = computed(() => {
    if (!displaySrc.value) return true
    if (stickerError.value) return true
    return !stickerReady.value
  })

  const isLocalPendingUrl = (url: string) =>
    !!resolveLocalMediaFilePath(url) || url.startsWith('blob:') || url.startsWith('data:')

  const normalizedStickerId = computed(() => {
    const raw = props.content.stickerId
    if (raw == null) return ''
    return String(raw).trim()
  })

  const revokeBlobObjectUrl = () => {
    if (!blobObjectUrl.value) return
    URL.revokeObjectURL(blobObjectUrl.value)
    blobObjectUrl.value = ''
  }

  const persistLocalPath = (localPath: string) => {
    void messageDbStore.updateStickerMessageLocalExt(props.messageId, { localPath })
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
        persistLocalPath(localPath)
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
    if (displaySrc.value === nextSrc) return
    stickerReady.value = false
    stickerError.value = false
    currentLocalPath.value = localPath
    assetFallbackAttempted = false
    if (!localPath) revokeBlobObjectUrl()
    displaySrc.value = nextSrc
  }

  const syncDisplaySrc = () => {
    const run = async () => {
      const storageRoot = await resolveMessageStorageRoot(appSettingsStore.storage.path)

      const localPath = props.localExt?.localPath
      if (localPath && (await exists(localPath))) {
        applyDisplaySrc(toLocalFileDisplayUrl(localPath), localPath)
        return
      }

      const sharedPath = await findSharedStickerCachePath(storageRoot)
      if (sharedPath) {
        persistLocalPath(sharedPath)
        applyDisplaySrc(toLocalFileDisplayUrl(sharedPath), sharedPath)
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

  watch(
    () => props.messageId,
    () => {
      cacheInFlight.value = false
    }
  )

  watch(
    () => [props.messageId, normalizedStickerId.value, props.content.stickerUrl, props.localExt] as const,
    syncDisplaySrc,
    { immediate: true }
  )

  const onStickerLoad = () => {
    stickerReady.value = true
    stickerError.value = false
    scheduleStickerCache()
  }

  const onStickerError = () => {
    if (currentLocalPath.value && !assetFallbackAttempted) {
      assetFallbackAttempted = true
      readLocalFileAsObjectUrl(currentLocalPath.value)
        .then((url) => {
          revokeBlobObjectUrl()
          blobObjectUrl.value = url
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
    display: grid;
    width: 120px;
    height: 120px;
    line-height: 0;

    > * {
      grid-area: 1 / 1;
    }
  }

  .message-sticker__placeholder {
    width: 100%;
    height: 100%;
    border-radius: 6px;
    background: var(--bg-secondary-color);
  }

  .message-sticker {
    display: block;
    width: 120px;
    height: 120px;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;

    &--hidden {
      opacity: 0;
    }
  }
</style>
