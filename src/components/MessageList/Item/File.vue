<template>
  <a class="message-file" target="_blank" rel="noopener noreferrer">
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
      <span class="message-file__size">{{ formatSize(content.fileSize) }}</span>
    </div>
  </a>
</template>

<script setup lang="ts">
  import type { CSSProperties } from 'vue'
  import type { FileContent } from '@/types/api/message'
  import { getFileIconUrl, isFileNameTruncated, splitFileName, truncateFileBase } from '@/utils/fileIcon'

  const props = defineProps<{
    content: FileContent
  }>()

  const iconUrl = computed(() => getFileIconUrl(props.content.fileName, props.content.fileType))

  const fileNameParts = computed(() => splitFileName(props.content.fileName))

  const displayBase = computed(() => truncateFileBase(fileNameParts.value.base))

  const isNameTruncated = computed(() => isFileNameTruncated(fileNameParts.value.base))

  const tooltipContentStyle: CSSProperties = {
    background: 'var(--bg-primary-color)',
    color: 'var(--text-primary-color)',
    maxWidth: '308px'
  }

  const formatSize = (size: string) => {
    const bytes = Number(size)
    if (!Number.isFinite(bytes) || bytes <= 0) return size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }
</script>

<style scoped lang="scss">
  .message-file {
    --file-card-width: 240px;
    --file-card-padding-x: 10px;
    --file-card-padding-y: 10px;

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
    }
  }
</style>
