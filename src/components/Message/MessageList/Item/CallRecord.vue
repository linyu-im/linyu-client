<template>
  <div class="message-call-record">
    <svg class="message-call-record__icon" aria-hidden="true">
      <use :href="iconHref" />
    </svg>
    <span class="message-call-record__text">{{ summary }}</span>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import type { CallRecordContent } from '@/types/api/message'
  import { formatCallRecordSummary } from '@/utils/message/callRecord'

  const props = defineProps<{
    content: CallRecordContent
  }>()

  const { t } = useI18n()

  const iconHref = computed(() => (props.content.callType === 'video' ? '#video' : '#phone'))

  const summary = computed(() => formatCallRecordSummary(props.content, t))
</script>

<style scoped lang="scss">
  .message-call-record {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    color: inherit;
    font-size: 14px;
    line-height: 1;
    white-space: nowrap;
    user-select: none;

    &__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: currentColor;
    }

    &__text {
      flex-shrink: 0;
      line-height: 1.4;
    }
  }
</style>
