<template>
  <UploadProgress
    :uploading="uploading || downloading"
    :progress="uploading ? uploadProgress : downloadProgress"
    variant="file">
    <a
      class="message-file"
      href="#"
      draggable="false"
      @dragstart.prevent
      @mousedown="onMouseDown"
      @click.prevent="onClick">
      <img class="message-file__icon" :src="iconUrl" :alt="content.fileName" draggable="false" />
      <div class="message-file__info">
        <n-tooltip trigger="hover" placement="top" :disabled="!isNameTruncated" :content-style="tooltipContentStyle">
          <template #trigger>
            <p class="message-file__name">
              <span class="message-file__name-base">{{ displayBase }}</span>
              <span v-if="fileNameParts.suffix" class="message-file__name-suffix">{{ fileNameParts.suffix }}</span>
            </p>
          </template>
          {{ content.fileName }}
        </n-tooltip>
        <div class="message-file__meta">
          <span class="message-file__size" :class="{ 'message-file__size--uploading': uploading || downloading }">
            <template v-if="uploading">{{ uploadProgress }}%</template>
            <template v-else-if="downloading">{{ downloadProgress }}%</template>
            <template v-else>{{ formatSize(content.fileSize) }}</template>
          </span>
          <span v-if="!isDownloaded && !downloading" class="message-file__status">
            {{ t('message.file.notDownloaded') }}
          </span>
        </div>
      </div>
    </a>
  </UploadProgress>

  <FileReceiveModal
    v-model:show="receiveModalVisible"
    :file-name="content.fileName"
    :file-type="content.fileType"
    :file-size="content.fileSize"
    @receive="onReceiveConfirm" />
</template>

<script setup lang="ts">
  import type { CSSProperties } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { openLocalFile } from '@/utils/file/openLocalFile'
  import { prepareLocalFileDrag, startLocalFileDrag } from '@/utils/file/dragLocalFile'
  import type { FileContent, FileMessageLocalExt } from '@/types/api/message'
  import { FILE_MESSAGE_STATUS_DOWNLOADED } from '@/utils/message/messageLocalExt'
  import { downloadMessageToStorage, resolveMessageStorageRoot } from '@/utils/message/messageFileSave'
  import { getFileIconUrl, isFileNameTruncated, splitFileName, truncateFileBase } from '@/utils/file/fileIcon'
  import UploadProgress from '@/components/Message/UploadProgress.vue'
  import FileReceiveModal from '@/components/Modal/FileReceiveModal.vue'
  import { useMessageUploadProgress } from '@/composables/useMessageUploadProgress'
  import { useMessageDownloadProgress } from '@/composables/useMessageDownloadProgress'
  import { useAppSettingsStore } from '@/stores/app/appSettings'
  import { useMessageDbStore } from '@/stores/message/messageDb'
  import { useMessageDownloadStore } from '@/stores/message/messageDownload'

  const props = defineProps<{
    messageId: string
    content: FileContent
    localExt?: FileMessageLocalExt
  }>()

  const { t } = useI18n()
  const appSettingsStore = useAppSettingsStore()
  const messageDbStore = useMessageDbStore()
  const messageDownloadStore = useMessageDownloadStore()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)
  const { downloading, downloadProgress } = useMessageDownloadProgress(() => props.messageId)
  const receiveModalVisible = ref(false)
  const receivedLocalExt = ref<FileMessageLocalExt>()

  const TAP_DISTANCE = 8
  const DRAG_THRESHOLD = 8

  let activePointerTrack: (() => void) | null = null

  const fileLocalExt = computed(() => receivedLocalExt.value ?? props.localExt)

  const isDownloaded = computed(() => fileLocalExt.value?.status === FILE_MESSAGE_STATUS_DOWNLOADED)

  const canDragOut = computed(
    () => isDownloaded.value && !!fileLocalExt.value?.localPath && !uploading.value && !downloading.value
  )

  watch(
    () =>
      canDragOut.value
        ? {
            filePath: fileLocalExt.value?.localPath,
            fileName: props.content.fileName,
            fileType: props.content.fileType
          }
        : null,
    (target) => {
      if (!target?.filePath) return
      void prepareLocalFileDrag({
        filePath: target.filePath,
        fileName: target.fileName,
        fileType: target.fileType
      })
    },
    { immediate: true }
  )

  const iconUrl = computed(() => getFileIconUrl(props.content.fileName, props.content.fileType))

  const fileNameParts = computed(() => splitFileName(props.content.fileName))

  const displayBase = computed(() => truncateFileBase(fileNameParts.value.base))

  const isNameTruncated = computed(() => isFileNameTruncated(fileNameParts.value.base))

  const tooltipContentStyle: CSSProperties = {
    background: 'var(--bg-primary-color)',
    color: 'var(--text-primary-color)',
    maxWidth: '308px'
  }

  const formatSize = (size: number | string) => {
    const bytes = Number(size)
    if (!Number.isFinite(bytes) || bytes <= 0) return String(size)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }

  const persistDownloaded = (localPath: string) => {
    const localExt = { status: FILE_MESSAGE_STATUS_DOWNLOADED, localPath }
    receivedLocalExt.value = localExt
    void messageDbStore.updateFileMessageLocalExt(props.messageId, localExt)
  }

  const receiveDownload = () => {
    if (uploading.value || downloading.value || !props.content.fileUrl) return

    messageDownloadStore.setProgress(props.messageId, 0)
    resolveMessageStorageRoot(appSettingsStore.storage.path)
      .then((storageRoot) => {
        return downloadMessageToStorage({
          storageRoot,
          sourceUrl: props.content.fileUrl,
          category: 'file',
          fileName: props.content.fileName,
          onProgress: (progress) => messageDownloadStore.setProgress(props.messageId, progress)
        })
      })
      .then((localPath) => {
        persistDownloaded(localPath)
        void prepareLocalFileDrag({
          filePath: localPath,
          fileName: props.content.fileName,
          fileType: props.content.fileType
        })
      })
      .catch(() => {
        window.$message.error(t('message.file.downloadFailed'))
      })
      .finally(() => {
        messageDownloadStore.clearProgress(props.messageId)
      })
  }

  const openDownloadedFile = (localPath: string) => {
    openLocalFile(localPath).catch(() => {
      window.$message.error(t('message.file.openFailed'))
    })
  }

  const onClick = () => {
    if (uploading.value || downloading.value || !props.content.fileUrl) return
    // 已下载且支持拖出：点击打开�?mouseup + 拖拽结束判断，避�?startDrag 吞掉 click
    if (canDragOut.value) return
    if (!isDownloaded.value) {
      receiveModalVisible.value = true
      return
    }
    const localPath = fileLocalExt.value?.localPath
    if (!localPath) {
      receiveDownload()
      return
    }
    openDownloadedFile(localPath)
  }

  const onReceiveConfirm = () => {
    receiveModalVisible.value = false
    receiveDownload()
  }

  const onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return
    if (!canDragOut.value) return

    const localPath = fileLocalExt.value?.localPath
    if (!localPath) return

    const startX = event.clientX
    const startY = event.clientY
    let dragStarted = false

    const cleanup = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (activePointerTrack === cleanup) {
        activePointerTrack = null
      }
    }

    const onMove = (moveEvent: MouseEvent) => {
      if (dragStarted) return
      const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY)
      if (distance < DRAG_THRESHOLD) return

      dragStarted = true
      void startLocalFileDrag(
        {
          filePath: localPath,
          fileName: props.content.fileName,
          fileType: props.content.fileType
        },
        () => {}
      ).catch(() => {})
    }

    const onUp = (upEvent: MouseEvent) => {
      cleanup()
      if (upEvent.button !== 0 || dragStarted) return

      const distance = Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY)
      if (distance <= TAP_DISTANCE) {
        openDownloadedFile(localPath)
      }
    }

    activePointerTrack?.()
    activePointerTrack = cleanup
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  onBeforeUnmount(() => {
    activePointerTrack?.()
  })
</script>

<style scoped lang="scss">
  .message-file {
    --file-card-width: 240px;
    --file-card-padding-x: 10px;
    --file-card-padding-y: 10px;

    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    width: var(--file-card-width);
    padding: var(--file-card-padding-y) var(--file-card-padding-x);
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: var(--text-primary-color);
    -webkit-user-drag: none;

    &__icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    &__info {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    &__name {
      margin: 0;
      line-height: 1.4;
      max-height: calc(1.4em * 2);
      overflow: hidden;
      word-break: break-all;
      cursor: pointer;
    }

    &__name-base,
    &__name-suffix {
      display: inline;
    }

    &__name-suffix {
      white-space: nowrap;
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    &__size {
      line-height: 1;
      color: var(--text-secondary-color);
      font-size: 12px;
      font-variant-numeric: tabular-nums;

      &--uploading {
        color: var(--primary-color);
      }
    }

    &__status {
      flex-shrink: 0;
      line-height: 1;
      font-size: 12px;
      color: var(--text-muted-color);
    }
  }
</style>
