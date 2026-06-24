<template>
  <div>
    <div class="avatar-profile-card__head">
      <Avatar class="avatar-profile-card__avatar shrink-0" :id="id" :profile-enabled="false" :refresh="true" />
      <div class="avatar-profile-card__head-main min-w-0 flex-1">
        <div class="avatar-profile-card__title-row">
          <div class="avatar-profile-card__title truncate">
            {{ displayName }}
            <svg v-if="genderIconHref" class="avatar-profile-card__gender-icon size-14px" :class="genderClass">
              <use :href="genderIconHref" />
            </svg>
          </div>
        </div>
        <div class="avatar-profile-card__brief-row">
          <span class="avatar-profile-card__brief-label">{{ t('avatarProfile.nickname') }}</span>
          <span class="avatar-profile-card__brief-value truncate">{{ userInfo?.username ?? '' }}</span>
        </div>
        <div class="avatar-profile-card__brief-row">
          <span class="avatar-profile-card__brief-label">{{ t('contacts.fields.linyuId') }}</span>
          <span class="avatar-profile-card__brief-value truncate">{{ userInfo?.account ?? '' }}</span>
        </div>
        <div v-if="locationText" class="avatar-profile-card__brief-row">
          <span class="avatar-profile-card__brief-label">{{ t('avatarProfile.region') }}</span>
          <span class="avatar-profile-card__brief-value truncate">{{ locationText }}</span>
        </div>
      </div>
    </div>

    <n-divider class="avatar-profile-card__divider" />

    <div class="avatar-profile-card__section-title">{{ t('avatarProfile.friendProfile') }}</div>
    <div class="avatar-profile-card__meta">
      <div v-if="emotionName" class="avatar-profile-card__row avatar-profile-card__row--emotion">
        <span class="avatar-profile-card__row-label">{{ t('avatarProfile.emotion') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__emotion">
            <span>[</span>
            <img v-if="emotionUrl" class="size-14px" :src="emotionUrl" alt="" />
            <span>{{ emotionName }}</span>
            <span>]</span>
          </span>
        </div>
      </div>
      <div v-if="remarkText" class="avatar-profile-card__row">
        <span class="avatar-profile-card__row-label">{{ t('contacts.fields.remark') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">
            {{ remarkText }}
          </span>
        </div>
      </div>
      <div v-if="tagText" class="avatar-profile-card__row">
        <span class="avatar-profile-card__row-label">{{ t('contacts.fields.tag') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">{{ tagText }}</span>
        </div>
      </div>
      <div v-if="signatureText" class="avatar-profile-card__row">
        <span class="avatar-profile-card__row-label">{{ t('contacts.fields.signature') }}</span>
        <div class="avatar-profile-card__value-slot">
          <span class="avatar-profile-card__row-value avatar-profile-card__row-value--ellipsis">
            {{ signatureText }}
          </span>
        </div>
      </div>
      <div v-if="momentThumbs.length > 0" class="avatar-profile-card__row avatar-profile-card__row--moments">
        <span class="avatar-profile-card__row-label">{{ t('contacts.fields.friendMoments') }}</span>
        <div class="avatar-profile-card__value-slot">
          <div class="avatar-profile-card__thumbs">
            <img
              v-for="(url, index) in momentThumbs"
              :key="`${url}-${index}`"
              class="avatar-profile-card__thumb"
              :src="url"
              alt="" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { UserInfoResult } from '@/types/api/user'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    id: string
    userInfo: UserInfoResult | null
  }>()

  const { t } = useI18n()

  const displayName = computed(() => {
    const info = props.userInfo
    if (!info) return ''
    return info.remark?.trim() || info.username || ''
  })

  const remarkText = computed(() => props.userInfo?.remark?.trim() ?? '')
  const tagText = computed(() => props.userInfo?.tag?.trim() ?? '')
  const signatureText = computed(() => props.userInfo?.signature?.trim() ?? '')

  const locationText = computed(() => {
    const info = props.userInfo
    if (!info) return ''
    return info.location?.trim() || info.moment?.location?.trim() || ''
  })

  const emotionName = computed(() => props.userInfo?.emotionName?.trim() ?? '')
  const emotionUrl = computed(() => props.userInfo?.emotionUrl ?? '')

  const momentThumbs = computed(() => {
    const media = props.userInfo?.moment?.mediaType
    if (!media?.length) return []
    return media
      .filter((item) => item.mediaType === 'img')
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.thumbUrl || item.url)
      .slice(0, 4)
  })

  const genderClass = computed(() => {
    const g = props.userInfo?.gender?.trim().toLowerCase()
    if (g === '女' || g === 'female' || g === 'f') return 'is-female'
    if (g === '男' || g === 'male' || g === 'm') return 'is-male'
    return ''
  })

  const genderIconHref = computed(() => {
    if (genderClass.value === 'is-male') return '#male'
    if (genderClass.value === 'is-female') return '#female'
    return ''
  })
</script>

<style scoped lang="scss">
  @use './avatarProfileCard.scss';
</style>
