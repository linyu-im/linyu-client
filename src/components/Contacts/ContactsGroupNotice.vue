<template>
  <div class="contacts-detail">
    <div class="contacts-detail__title">{{ t('contacts.views.groupNotice.title') }}</div>
    <div class="contacts-detail__cards">
      <div v-for="item in list" :key="item.id" class="contacts-apply-card">
        <Avatar class="size-48px rounded-8px bg-#FFF" :id="item.avatarId" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-6px">
            <span class="text-15px font-600">{{ item.name }}</span>
            <span class="contacts-apply-card__tag">{{ t('contacts.views.groupNotice.inviteTag') }}</span>
            <span class="contacts-apply-card__time">{{ item.time }}</span>
          </div>
          <div class="contacts-apply-card__msg">{{ item.message }}</div>
        </div>
        <n-button size="small" type="primary">{{ t('contacts.actions.agree') }}</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { ContactsGroupNoticeItem } from '@/types/api/contacts'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const list: ContactsGroupNoticeItem[] = [
    {
      id: 'gn-1',
      avatarId: 'gn-1',
      name: '天玺台',
      time: '20:20',
      message: '群名而来'
    },
    {
      id: 'gn-2',
      avatarId: 'gn-2',
      name: '天玺台',
      time: '20:20',
      message: '群名而来'
    }
  ]
</script>

<style scoped lang="scss">
  .contacts-detail {
    height: 100%;

    &__title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text-color);
      user-select: none;
    }

    &__cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  }

  .contacts-apply-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background-color: var(--bg-primary-color);
    border: 1px solid color-mix(in srgb, var(--border-color) 60%, transparent);
    border-radius: 10px;
    padding: 14px 16px;

    &__tag {
      font-size: 11px;
      color: var(--primary-color);
      background: color-mix(in srgb, var(--primary-color) 15%, transparent);
      padding: 2px 6px;
      border-radius: 10px;
    }

    &__time {
      font-size: 11px;
      color: var(--text-secondary-color);
    }

    &__msg {
      margin-top: 4px;
      font-size: 13px;
      color: var(--text-secondary-color);
    }
  }
</style>
