<template>
  <div>
    <div class="profile-card__head">
      <Avatar class="profile-card__avatar shrink-0" type="group" :id="id" :profile-enabled="false" :refresh="true" />
      <div class="profile-card__head-main min-w-0 flex-1">
        <div class="profile-card__title-row">
          <div class="profile-card__title truncate">
            {{ groupInfo?.name ?? '' }}
            <span class="profile-card__count">({{ groupInfo?.memberNum ?? 0 }})</span>
          </div>
        </div>
        <div class="profile-card__brief-row">
          <span class="profile-card__brief-label">{{ t('contacts.group.groupId') }}</span>
          <span class="profile-card__brief-value truncate">{{ groupInfo?.groupNumber ?? '' }}</span>
        </div>
      </div>
    </div>

    <n-divider class="profile-card__divider" />
    <div class="profile-card__meta">
      <div v-if="groupRemarkText" class="profile-card__row">
        <span class="profile-card__row-label">{{ t('contacts.group.remark') }}</span>
        <div class="profile-card__value-slot">
          <span class="profile-card__row-value profile-card__row-value--ellipsis">
            {{ groupRemarkText }}
          </span>
        </div>
      </div>
      <div v-if="groupAliasText" class="profile-card__row">
        <span class="profile-card__row-label">{{ t('contacts.group.alias') }}</span>
        <div class="profile-card__value-slot">
          <span class="profile-card__row-value profile-card__row-value--ellipsis">
            {{ groupAliasText }}
          </span>
        </div>
      </div>
      <div v-if="groupIntroText" class="profile-card__row">
        <span class="profile-card__row-label">{{ t('contacts.group.intro') }}</span>
        <div class="profile-card__value-slot">
          <span class="profile-card__row-value profile-card__row-value--ellipsis">
            {{ groupIntroText }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { GroupInfoResult } from '@/types/api/group'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    id: string
    groupProfile: GroupInfoResult | null
    currentUserId: string
  }>()

  const { t } = useI18n()

  const groupInfo = computed(() => props.groupProfile?.info)

  const groupRemarkText = computed(() => {
    const member = props.groupProfile?.tops?.find((item) => item.userId === props.currentUserId)
    return member?.groupNickName?.trim() ?? ''
  })

  const groupAliasText = computed(() => {
    const member = props.groupProfile?.tops?.find((item) => item.userId === props.currentUserId)
    return member?.groupNickName?.trim() ?? ''
  })

  const groupIntroText = computed(() => groupInfo.value?.describe?.trim() ?? '')
</script>

<style scoped lang="scss">
  .profile-card {
    &__head {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      width: 100%;
      min-width: 0;
    }

    &__avatar {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      background: var(--bg-secondary-color);
    }

    &__head-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    &__title-row {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    &__title {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 16px;
      font-weight: 700;
      color: var(--text-color);
      min-width: 0;
    }

    &__count {
      font-size: 14px;
      font-weight: 400;
      color: var(--text-muted-color);
      flex-shrink: 0;
    }

    &__brief-row {
      display: flex;
      align-items: center;
      min-width: 0;
      font-size: 12px;
      line-height: 18px;
    }

    &__brief-label {
      flex-shrink: 0;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__brief-value {
      flex: 1 1 0;
      min-width: 0;
      margin-left: 4px;
      color: var(--text-secondary-color);
      text-align: left;
    }

    &__divider {
      margin: 12px 0;

      :deep(.n-divider__line) {
        background-color: var(--divider-color);
      }
    }

    &__meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__row {
      display: flex;
      align-items: center;
      min-width: 0;
      font-size: 13px;
      line-height: 20px;
    }

    &__row-label {
      flex-shrink: 0;
      min-width: 70px;
      color: var(--text-muted-color);
      user-select: none;
    }

    &__value-slot {
      flex: 1 1 0;
      min-width: 0;
      overflow: hidden;
    }

    &__row-value {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--text-color);
      text-align: left;

      &--ellipsis {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        user-select: none;
        cursor: default;
      }
    }
  }
</style>
