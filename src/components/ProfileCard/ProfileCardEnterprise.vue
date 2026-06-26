<template>
  <div>
    <div class="profile-card__head">
      <Avatar
        class="profile-card__avatar shrink-0"
        type="enterprise"
        :id="id"
        :profile-enabled="false"
        :refresh="true" />
      <div class="profile-card__head-main min-w-0 flex-1">
        <div class="profile-card__title-row">
          <div class="profile-card__title truncate">
            {{ enterpriseInfo?.name ?? '' }}
            <n-tag v-if="enterpriseInfo?.enterpriseTag" size="small" round type="info" class="m-l-6px">
              {{ enterpriseInfo.enterpriseTag }}
            </n-tag>
          </div>
        </div>
        <div class="profile-card__brief-row">
          <span class="profile-card__brief-value truncate">
            {{ enterpriseInfo?.location || '-' }}
            <span class="profile-card__meta-sep">·</span>
            {{ t('avatarProfile.memberCount', { count: enterpriseInfo?.memberNum ?? 0 }) }}
          </span>
        </div>
      </div>
    </div>

    <template v-if="enterpriseDescribe">
      <n-divider class="profile-card__divider" />
      <div class="profile-card__meta">
        <div class="profile-card__row">
          <span class="profile-card__row-label">{{ t('avatarProfile.enterpriseIntro') }}</span>
          <div class="profile-card__value-slot">
            <span class="profile-card__row-value profile-card__row-value--ellipsis">
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
  @use './profileCard.scss';
</style>
