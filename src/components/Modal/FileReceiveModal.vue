<template>
  <n-modal v-model:show="visible" :mask-closable="true" transform-origin="center">
    <div class="file-receive-modal">
      <div class="file-receive-modal__header">
        <button type="button" class="file-receive-modal__close" :aria-label="t('message.file.close')" @click="onClose">
          <svg class="size-14px" aria-hidden="true">
            <use href="#close" />
          </svg>
        </button>
      </div>
      <div class="file-receive-modal__body">
        <img class="file-receive-modal__icon" :src="iconUrl" :alt="fileName" />
        <p class="file-receive-modal__name">{{ fileName }}</p>
        <p class="file-receive-modal__size">{{ t('message.file.fileSize', { size: displaySize }) }}</p>
        <n-button type="primary" class="file-receive-modal__action" @click="onReceive">
          {{ t('message.file.receive') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { getFileIconUrl } from '@/utils/file/fileIcon'

  const visible = defineModel<boolean>('show', { default: false })

  const props = defineProps<{
    fileName: string
    fileType: string
    fileSize: number | string
  }>()

  const emit = defineEmits<{
    (e: 'receive'): void
    (e: 'close'): void
  }>()

  const { t } = useI18n()

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  const formatCompactSize = (size: number | string) => {
    const bytes = Number(size)
    if (!Number.isFinite(bytes) || bytes <= 0) return String(size)
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}M`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}G`
  }

  const iconUrl = computed(() => getFileIconUrl(props.fileName, props.fileType))

  const displaySize = computed(() => formatCompactSize(props.fileSize))

  const onReceive = () => {
    emit('receive')
  }

  const onClose = () => {
    visible.value = false
    emit('close')
  }
</script>

<style scoped lang="scss">
  .file-receive-modal {
    width: 420px;
    max-width: calc(100vw - 32px);
    min-height: 320px;
    border-radius: 8px;
    background: var(--bg-primary-color);
    border: 1px solid var(--border-color);
    overflow: hidden;
    display: flex;
    flex-direction: column;

    &__header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      height: 36px;
      padding: 0 8px;
    }

    &__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 70%, transparent);
        color: var(--text-color);
      }
    }

    &__body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 12px 40px 40px;
      text-align: center;
    }

    &__icon {
      width: 64px;
      height: 64px;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    &__name {
      margin: 24px 0 0;
      width: 100%;
      line-height: 1.5;
      font-size: 15px;
      color: var(--text-color);
      word-break: break-all;
    }

    &__size {
      margin: 12px 0 0;
      font-size: 14px;
      color: var(--text-secondary-color);
    }

    &__action {
      width: 100%;
      height: 44px;
      margin-top: 48px;
      border-radius: 6px;
      font-size: 15px;
    }
  }
</style>
