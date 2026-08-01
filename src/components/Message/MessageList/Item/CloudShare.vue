<template>
  <div class="message-cloud-share">
    <div class="message-cloud-share__main">
      <img class="message-cloud-share__icon" :src="iconUrl" :alt="displayName" draggable="false" />
      <div class="message-cloud-share__info">
        <n-tooltip trigger="hover" placement="top" :disabled="!isNameTruncated" :content-style="tooltipContentStyle">
          <template #trigger>
            <p class="message-cloud-share__name">
              <span class="message-cloud-share__name-base">{{ displayBase }}</span>
              <span v-if="nameSuffix" class="message-cloud-share__name-suffix">{{ nameSuffix }}</span>
              <span v-if="isMulti" class="message-cloud-share__name-extra">{{ multiSuffix }}</span>
            </p>
          </template>
          {{ displayName }}
        </n-tooltip>
        <span class="message-cloud-share__meta">{{ metaLabel }}</span>
      </div>
    </div>
    <div class="message-cloud-share__footer">{{ t('message.cloudShare.label') }}</div>
  </div>
</template>

<script setup lang="ts">
  import type { CSSProperties } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { CloudShareContent, CloudShareItem } from '@/types/api/message'
  import {
    getFileExtension,
    getFileIconUrl,
    getFolderIconUrl,
    isFileNameTruncated,
    splitFileName,
    truncateFileBase
  } from '@/utils/file/fileIcon'

  const MORE_ICON_URL = '/file/more.png'
  /** 与文件消息主体上限一致（约两行） */
  const NAME_BASE_MAX_LEN = 22
  /** 文件扩展名预留，多文件时让给「等 x 个文件」 */
  const NAME_EXT_RESERVE = 4

  const props = defineProps<{
    content: CloudShareContent
  }>()

  const { t } = useI18n()

  const tooltipContentStyle: CSSProperties = {
    background: 'var(--bg-primary-color)',
    color: 'var(--text-primary-color)',
    maxWidth: '308px'
  }

  const files = computed(() => props.content?.files ?? [])

  const firstFile = computed(() => files.value[0] as CloudShareItem | undefined)

  const isMulti = computed(() => files.value.length > 1)

  const firstShareName = computed(() => firstFile.value?.shareName || '')

  const multiSuffix = computed(() =>
    t('message.cloudShare.multiSuffix', {
      count: files.value.length
    })
  )

  const multiNameMaxLen = computed(() => Math.max(6, NAME_BASE_MAX_LEN + NAME_EXT_RESERVE - multiSuffix.value.length))

  const displayName = computed(() => {
    if (files.value.length === 0) return t('message.cloudShare.empty')
    if (isMulti.value) {
      return t('message.cloudShare.multiName', {
        name: firstShareName.value,
        count: files.value.length
      })
    }
    return firstShareName.value || t('message.cloudShare.empty')
  })

  const nameParts = computed(() => splitFileName(firstShareName.value))

  const displayBase = computed(() => {
    if (files.value.length === 0) return t('message.cloudShare.empty')
    if (isMulti.value) {
      return truncateFileBase(firstShareName.value || t('message.cloudShare.empty'), multiNameMaxLen.value)
    }
    return truncateFileBase(nameParts.value.base)
  })

  const nameSuffix = computed(() => (isMulti.value ? '' : nameParts.value.suffix))

  const isNameTruncated = computed(() => {
    if (isMulti.value) return isFileNameTruncated(firstShareName.value, multiNameMaxLen.value)
    return isFileNameTruncated(nameParts.value.base)
  })

  const resolveItemIconUrl = (item: CloudShareItem) => {
    if (item.isDir || item.fileType?.toLowerCase() === 'folder') {
      return getFolderIconUrl()
    }
    const ext = (item.fileType || '').trim().toLowerCase()
    const name = item.shareName || ''
    const fileName = getFileExtension(name) || !ext ? name : `${name}.${ext}`
    return getFileIconUrl(fileName)
  }

  const iconUrl = computed(() => {
    if (isMulti.value) return MORE_ICON_URL
    if (!firstFile.value) return getFileIconUrl('unknown')
    return resolveItemIconUrl(firstFile.value)
  })

  const formatSize = (size: number | string) => {
    const bytes = Number(size)
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }

  const metaLabel = computed(() => {
    if (files.value.length === 0) return '-'
    if (isMulti.value) {
      const totalSize = files.value.reduce((sum, item) => sum + (Number(item.fileSize) || 0), 0)
      return t('message.cloudShare.multiMeta', {
        count: files.value.length,
        size: formatSize(totalSize)
      })
    }
    const item = firstFile.value
    if (!item) return '-'
    if (item.isDir || item.fileType?.toLowerCase() === 'folder') {
      return t('drive.files.types.folder')
    }
    return formatSize(item.fileSize)
  })
</script>

<style scoped lang="scss">
  .message-cloud-share {
    box-sizing: border-box;
    width: 240px;
    background: var(--bg-primary-color);
    border-radius: 8px;
    overflow: hidden;
    color: var(--text-primary-color);
    user-select: none;

    &__main {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
    }

    &__icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      object-fit: contain;
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
      color: var(--text-color);
      font-size: 14px;
    }

    &__name-base,
    &__name-suffix,
    &__name-extra {
      display: inline;
    }

    &__name-suffix,
    &__name-extra {
      white-space: nowrap;
    }

    &__meta {
      line-height: 1;
      color: var(--text-secondary-color);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    &__footer {
      padding: 8px 10px;
      border-top: 1px solid var(--divider-color);
      font-size: 12px;
      line-height: 1;
      color: var(--text-secondary-color);
    }
  }
</style>
