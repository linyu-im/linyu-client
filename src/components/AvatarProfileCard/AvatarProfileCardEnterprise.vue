<template>
  <div>
    <div class="avatar-profile-card__head">
      <Avatar
        class="avatar-profile-card__avatar shrink-0"
        type="enterprise"
        :id="id"
        :profile-enabled="false"
        :refresh="true" />
      <div class="avatar-profile-card__head-main min-w-0 flex-1">
        <div class="avatar-profile-card__title-row">
          <div class="avatar-profile-card__title truncate">
            {{ enterpriseInfo?.name ?? '' }}
            <n-tag v-if="enterpriseInfo?.enterpriseTag" size="small" round type="info" class="m-l-6px">
              {{ enterpriseInfo.enterpriseTag }}
            </n-tag>
          </div>
        </div>
        <div class="avatar-profile-card__brief-row">
          <span class="avatar-profile-card__brief-value truncate">
            {{ enterpriseInfo?.location || '-' }}
            <span class="avatar-profile-card__meta-sep">·</span>
            {{ t('avatarProfile.memberCount', { count: enterpriseInfo?.memberNum ?? 0 }) }}
          </span>
        </div>
      </div>
    </div>

    <template v-if="enterpriseDescribe">
      <n-divider class="avatar-profile-card__divider" />
      <div class="avatar-profile-card__meta">
        <div class="avatar-profile-card__row">
          <span class="avatar-profile-card__row-label">{{ t('avatarProfile.enterpriseIntro') }}</span>
          <div class="avatar-profile-card__value-slot">
            <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">
              {{ enterpriseDescribe }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import type { EnterprisInfo } from '@/types/api/enterprise'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    id: string
    enterpriseInfo: EnterprisInfo | null
  }>()

  const { t } = useI18n()

  const enterpriseDescribe = computed(() => props.enterpriseInfo?.describe?.trim() ?? '')
</script>

<style scoped lang="scss">
  @use './avatarProfileCard.scss';
</style>
