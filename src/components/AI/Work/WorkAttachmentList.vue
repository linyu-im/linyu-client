<template>
  <div v-if="attachments.length" class="work-attachments" :class="{ 'work-attachments__compact': compact }">
    <article v-for="attachment in attachments" :key="attachment.id" class="work-attachments__item">
      <span class="work-attachments__icon">
        <svg><use :href="attachmentIcon(attachment.category)" /></svg>
      </span>
      <span class="work-attachments__info">
        <strong :title="attachment.path">{{ attachment.name }}</strong>
        <small>{{ attachmentMeta(attachment) }}</small>
      </span>
      <button
        v-if="removable"
        type="button"
        class="work-attachments__remove"
        :title="t('ai.work.attachments.remove')"
        @click="emit('remove', attachment.id)">
        ×
      </button>
    </article>
  </div>
</template>

<script setup lang="ts">
  import type { WorkAttachmentRecord } from '@/db/workAssistant'
  import { useI18n } from 'vue-i18n'

  withDefaults(
    defineProps<{
      attachments: WorkAttachmentRecord[]
      removable?: boolean
      compact?: boolean
    }>(),
    {
      removable: false,
      compact: false
    }
  )

  const emit = defineEmits<{ remove: [id: string] }>()
  const { t } = useI18n()

  const attachmentIcon = (category: WorkAttachmentRecord['category']) => {
    if (category === 'image') return '#image'
    if (category === 'spreadsheet') return '#chart'
    if (category === 'archive') return '#folder'
    return '#document'
  }

  const formatSize = (size: number) => {
    if (!size) return t('ai.work.attachments.localFile')
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  const attachmentMeta = (attachment: WorkAttachmentRecord) =>
    `${t(`ai.work.attachments.categories.${attachment.category}`)} · ${formatSize(attachment.size)}`
</script>

<style scoped lang="scss">
  .work-attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    min-width: 0;
    &__item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: min(220px, 100%);
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid var(--border-color);
      border-radius: 9px;
      background: var(--card-bg-color);
      box-sizing: border-box;
    }
    &__icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 30px;
      height: 30px;
      border-radius: 7px;
      background: color-mix(in srgb, var(--primary-color) 10%, var(--bg-muted-color));
      color: var(--primary-color);
    }
    &__icon svg {
      width: 15px;
      height: 15px;
    }
    &__info {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      line-height: 1.3;
    }
    &__info strong {
      overflow: hidden;
      color: var(--text-color);
      font-size: 11px;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &__info small {
      margin-top: 2px;
      color: var(--text-muted-color);
      font-size: 9px;
    }
    &__remove {
      display: grid;
      place-items: center;
      flex: none;
      width: 20px;
      height: 20px;
      padding: 0;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
    }
    &__compact &__item {
      width: auto;
      max-width: 190px;
      padding: 5px 7px;
    }
    &__compact &__icon {
      width: 24px;
      height: 24px;
    }
  }
</style>
