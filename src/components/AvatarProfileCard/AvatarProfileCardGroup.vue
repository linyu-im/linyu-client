<template>
  <div>
    <div class="avatar-profile-card__head">
      <Avatar
        class="avatar-profile-card__avatar shrink-0"
        type="group"
        :id="id"
        :profile-enabled="false"
        :refresh="true" />
      <div class="avatar-profile-card__head-main min-w-0 flex-1">
        <div class="avatar-profile-card__title-row">
          <div class="avatar-profile-card__title truncate">
            {{ groupInfo?.name ?? '' }}
            <span class="avatar-profile-card__count">({{ groupInfo?.memberNum ?? 0 }})</span>
          </div>
        </div>
        <div class="avatar-profile-card__brief-row">
          <span class="avatar-profile-card__brief-label">{{ t('contacts.group.groupId') }}</span>
          <span class="avatar-profile-card__brief-value truncate">{{ groupInfo?.groupNumber ?? '' }}</span>
        </div>
      </div>
    </div>

    <n-divider class="avatar-profile-card__divider" />
    <div class="avatar-profile-card__meta">
      <div v-if="groupRemarkText" class="avatar-profile-card__row">
        <span class="avatar-profile-card__row-label">{{ t('contacts.group.remark') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">
            {{ groupRemarkText }}
          </span>
        </div>
      </div>
      <div v-if="groupAliasText" class="avatar-profile-card__row">
        <span class="avatar-profile-card__row-label">{{ t('contacts.group.alias') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">
            {{ groupAliasText }}
          </span>
        </div>
      </div>
      <div v-if="groupIntroText" class="avatar-profile-card__row">
        <span class="avatar-profile-card__row-label">{{ t('contacts.group.intro') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">
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
    return member?.groupRemark?.trim() ?? ''
  })

  const groupAliasText = computed(() => {
    const member = props.groupProfile?.tops?.find((item) => item.userId === props.currentUserId)
    return member?.groupNickName?.trim() ?? ''
  })

  const groupIntroText = computed(() => groupInfo.value?.describe?.trim() ?? '')
</script>

<style scoped lang="scss">
  @use './avatarProfileCard.scss';
</style>
