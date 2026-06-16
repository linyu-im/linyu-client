<template>
  <UploadProgress :uploading="uploading" :progress="uploadProgress" variant="file">
    <a class="message-file" href="#" @click.prevent="onDownload">
      <img class="message-file__icon" :src="iconUrl" :alt="content.fileName" />
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
        <span class="message-file__size" :class="{ 'message-file__size--uploading': uploading || downloading }">
          <template v-if="uploading">{{ uploadProgress }}%</template>
          <template v-else-if="downloading">{{ downloadProgress }}%</template>
          <template v-else>{{ formatSize(content.fileSize) }}</template>
        </span>
      </div>
    </a>
  </UploadProgress>
</template>

<script setup lang="ts">
  import type { CSSProperties } from 'vue'
  import { save } from '@tauri-apps/plugin-dialog'
  import { writeFile } from '@tauri-apps/plugin-fs'
  import type { FileContent } from '@/types/api/message'
  import { getFileIconUrl, isFileNameTruncated, splitFileName, truncateFileBase } from '@/utils/fileIcon'
  import UploadProgress from '@/components/Message/UploadProgress.vue'
  import { useMessageUploadProgress } from '@/composables/useMessageUploadProgress'

  const props = defineProps<{
    messageId: string
    content: FileContent
  }>()

  const { uploading, uploadProgress } = useMessageUploadProgress(() => props.messageId)
  const downloading = ref(false)
  const downloadProgress = ref(0)

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

  const requestBinary = (url: string) =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.responseType = 'arraybuffer'

      xhr.onprogress = (event) => {
        if (!event.lengthComputable || event.total <= 0) return
        downloadProgress.value = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)))
      }

      xhr.onerror = () => reject(new Error('network error'))
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
          resolve(xhr.response as ArrayBuffer)
          return
        }
        reject(new Error(`http ${xhr.status}`))
      }
      xhr.send()
    })

  const onDownload = () => {
    if (uploading.value || downloading.value || !props.content.fileUrl) return
    save({
      defaultPath: props.content.fileName
    }).then((path) => {
      if (!path) return
      downloading.value = true
      downloadProgress.value = 0
      return requestBinary(props.content.fileUrl)
        .then((buffer) => writeFile(path, new Uint8Array(buffer)))
        .then(() => {
          downloadProgress.value = 100
        })
        .catch(() => {
          downloadProgress.value = 0
        })
        .finally(() => {
          downloading.value = false
        })
    })
  }
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
      cursor: default;
    }

    &__name-base,
    &__name-suffix {
      display: inline;
    }

    &__name-suffix {
      white-space: nowrap;
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
  }
</style>
