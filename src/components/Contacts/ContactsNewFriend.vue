<template>
  <div class="contacts-detail">
    <div class="contacts-detail__title">{{ t('contacts.views.newFriend.title') }}</div>
    <div class="contacts-detail__cards">
      <div v-for="item in list" :key="item.id" class="contacts-apply-card">
        <Avatar class="size-48px rounded-8px bg-#FFF" :id="item.avatarId" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-6px">
            <span class="text-15px font-600">{{ item.name }}</span>
            <span class="contacts-apply-card__tag">{{ t(item.sourceKey) }}</span>
            <span class="contacts-apply-card__time">{{ item.time }}</span>
          </div>
          <div class="contacts-apply-card__msg">{{ item.message }}</div>
        </div>
        <div v-if="item.status === 'pending'" class="flex items-center gap-10px">
          <n-button size="small" type="default">{{ t('contacts.actions.reject') }}</n-button>
          <n-dropdown :options="applyActionOptions">
            <n-button size="small" type="primary">{{ t('contacts.actions.agree') }}</n-button>
          </n-dropdown>
        </div>
        <div v-else class="contacts-apply-card__done">{{ t('contacts.actions.completed') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { ContactsNewFriendItem } from '@/types/api/contacts'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const list: ContactsNewFriendItem[] = [
    {
      id: 'nf-1',
      avatarId: 'nf-1',
      name: '天玺台',
      sourceKey: 'contacts.views.newFriend.source',
      time: '20:20',
      message: '我是小时',
      status: 'pending'
    },
    {
      id: 'nf-2',
      avatarId: 'nf-2',
      name: '消息姬',
      sourceKey: 'contacts.views.newFriend.source',
      time: '11/20',
      message: '我是超超',
      status: 'pending'
    },
    {
      id: 'nf-3',
      avatarId: 'nf-3',
      name: '呢吧啊',
      sourceKey: 'contacts.views.newFriend.source',
      time: '9/27',
      message: '颜值哥333',
      status: 'done'
    }
  ]

  const applyActionOptions = computed(() => [
    { label: t('contacts.actions.acceptAndAddTag'), key: 'acceptAndAddTag' },
    { label: t('contacts.actions.acceptAndSetRemark'), key: 'acceptAndSetRemark' }
  ])
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

    &__done {
      font-size: 13px;
      color: var(--text-secondary-color);
      user-select: none;
    }
  }
</style>
