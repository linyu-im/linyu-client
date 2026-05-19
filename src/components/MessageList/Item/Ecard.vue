<template>
  <div class="message-ecard" role="button" tabindex="0">
    <div class="message-ecard__main">
      <Avatar class="message-ecard__avatar" :id="content.userId" :size="44" />
      <div class="message-ecard__name">{{ content.userName }}</div>
    </div>
    <div class="message-ecard__footer">{{ t('message.ecard.recommend') }}</div>
  </div>
</template>

<script setup lang="ts">
  import type { ECardContent } from '@/types/api/message'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  defineProps<{
    content: ECardContent
  }>()
</script>

<style scoped lang="scss">
  .message-ecard {
    box-sizing: border-box;
    width: 240px;
    background: var(--bg-primary-color);
    border-radius: 8px;
    overflow: hidden;
    color: var(--text-primary-color);
    cursor: pointer;
    user-select: none;

    &__main {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
    }

    &__avatar {
      flex-shrink: 0;
      border-radius: 6px;
      overflow: hidden;
    }

    &__name {
      flex: 1;
      min-width: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__footer {
      padding: 8px 12px;
      border-top: 1px solid var(--divider-color);
      font-size: 12px;
      line-height: 1;
      color: var(--text-secondary-color);
    }
  }
</style>
