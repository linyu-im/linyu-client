<template>
  <div class="contacts-profile">
    <div class="contacts-profile__head">
      <Avatar class="size-62px rounded-10px bg-#FFF" type="group" :id="contact.peerId" />
      <div>
        <div class="text-26px font-700">{{ contact.groupName }}</div>
        <div class="contacts-profile__id">{{ t('contacts.fields.groupId') }} {{ contact.peerId }}</div>
      </div>
    </div>
    <div class="contacts-profile__line" />
    <div class="contacts-profile__meta">
      <div class="contacts-profile__row">
        <span>{{ t('contacts.fields.remark') }}</span>
        <span>{{ contact.remark || t('contacts.placeholders.setRemark') }}</span>
      </div>
      <div class="contacts-profile__row">
        <span>{{ t('contacts.fields.groupAlias') }}</span>
        <span>{{ mockProfileText.editAlias }}</span>
      </div>
      <div class="contacts-profile__row">
        <span>{{ t('contacts.fields.groupIntro') }}</span>
        <span>{{ mockProfileText.groupIntro }}</span>
      </div>
    </div>
    <div class="contacts-profile__actions">
      <n-button round>{{ t('contacts.actions.share') }}</n-button>
      <n-button type="primary" round>{{ t('contacts.actions.sendMessage') }}</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { Contact } from '@/types/api/contacts'
  import { useI18n } from 'vue-i18n'

  defineProps<{
    contact: Contact
  }>()

  const { t } = useI18n()

  const mockProfileText = {
    editAlias: '编辑本群昵称',
    groupIntro: '这是一个娱乐群，欢迎大家加入~'
  }
</script>

<style scoped lang="scss">
  .contacts-profile {
    height: 100%;
    max-width: 520px;
    margin: 30px auto 0;

    &__head {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    &__id {
      margin-top: 6px;
      font-size: 13px;
      color: var(--text-secondary-color);
    }

    &__line {
      height: 1px;
      background-color: var(--divider-color);
      margin: 16px 0;
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    &__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;

      span:first-child {
        color: var(--text-muted-color);
      }

      span:last-child {
        color: var(--text-secondary-color);
      }
    }

    &__actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 26px;
    }
  }
</style>
