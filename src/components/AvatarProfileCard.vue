<template>
  <n-spin :show="loading" class="avatar-profile-card__spin">
    <div class="avatar-profile-card">
      <!-- 用户 -->
      <template v-if="type === 'user'">
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
      </template>

      <!-- 群聊 -->
      <template v-else-if="type === 'group'">
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
      </template>

      <!-- 企业 -->
      <template v-else>
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
      </template>

      <div class="avatar-profile-card__actions">
        <button type="button" class="avatar-profile-card__action">
          <svg class="avatar-profile-card__action-icon size-18px">
            <use href="#message" />
          </svg>
          <span class="avatar-profile-card__action-label">{{ t('contacts.actions.sendMessage') }}</span>
        </button>
        <template v-if="showCallActions">
          <span class="avatar-profile-card__action-sep" aria-hidden="true" />
          <button type="button" class="avatar-profile-card__action">
            <svg class="avatar-profile-card__action-icon size-18px">
              <use href="#phone" />
            </svg>
            <span class="avatar-profile-card__action-label">{{ t('avatarProfile.voiceChat') }}</span>
          </button>
          <span class="avatar-profile-card__action-sep" aria-hidden="true" />
          <button type="button" class="avatar-profile-card__action">
            <svg class="avatar-profile-card__action-icon size-18px">
              <use href="#video" />
            </svg>
            <span class="avatar-profile-card__action-label">{{ t('avatarProfile.videoChat') }}</span>
          </button>
        </template>
      </div>
    </div>
  </n-spin>
</template>

<script setup lang="ts">
  import { enterpriseApi, groupApi, userApi } from '@/api'
  import { useUserStore } from '@/stores/user'
  import type { EnterprisInfo } from '@/types/api/enterprise'
  import type { GroupInfoResult } from '@/types/api/group'
  import type { UserInfoResult } from '@/types/api/user'
  import type { AvatarType } from '@/types/common'
  import { useI18n } from 'vue-i18n'

  const props = withDefaults(
    defineProps<{
      id: string
      type?: AvatarType
    }>(),
    {
      type: 'user'
    }
  )

  const emit = defineEmits<{
    positionChange: []
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()

  const loading = ref(false)
  const userInfo = ref<UserInfoResult | null>(null)
  const groupProfile = ref<GroupInfoResult | null>(null)
  const enterpriseInfo = ref<EnterprisInfo | null>(null)

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')

  const isSelf = computed(() => props.type === 'user' && props.id === currentUserId.value)

  const showCallActions = computed(() => props.type === 'user' && !isSelf.value)

  const fetchProfile = () => {
    if (!props.id) return

    loading.value = true
    userInfo.value = null
    groupProfile.value = null
    enterpriseInfo.value = null

    if (props.type === 'user') {
      userApi
        .getUserInfo({ userId: props.id })
        .then((res) => {
          if (res.code === 0 && res.data) {
            userInfo.value = res.data
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
        })
      return
    }

    if (props.type === 'group') {
      groupApi
        .getGroupInfo({ groupId: props.id })
        .then((res) => {
          if (res.code === 0 && res.data) {
            groupProfile.value = res.data
          } else {
            window.$message.error(res.msg)
          }
        })
        .finally(() => {
          loading.value = false
        })
      return
    }

    enterpriseApi
      .getEnterpriseInfo({ enterpriseId: props.id })
      .then((res) => {
        if (res.code === 0 && res.data) {
          enterpriseInfo.value = res.data
        } else {
          window.$message.error(res.msg)
        }
      })
      .finally(() => {
        loading.value = false
      })
  }

  watch(
    () => [props.id, props.type] as const,
    () => {
      fetchProfile()
    },
    { immediate: true }
  )

  watch(loading, (isLoading) => {
    if (!isLoading) {
      nextTick(() => {
        emit('positionChange')
      })
    }
  })

  const displayName = computed(() => {
    const info = userInfo.value
    if (!info) return ''
    return info.remark?.trim() || info.username || ''
  })

  const remarkText = computed(() => userInfo.value?.remark?.trim() ?? '')
  const tagText = computed(() => userInfo.value?.tag?.trim() ?? '')
  const signatureText = computed(() => userInfo.value?.signature?.trim() ?? '')

  const locationText = computed(() => {
    const info = userInfo.value
    if (!info) return ''
    return info.location?.trim() || info.moment?.location?.trim() || ''
  })

  const emotionName = computed(() => userInfo.value?.emotionName?.trim() ?? '')
  const emotionUrl = computed(() => userInfo.value?.emotionUrl ?? '')

  const momentThumbs = computed(() => {
    const media = userInfo.value?.moment?.mediaType
    if (!media?.length) return []
    return media
      .filter((item) => item.mediaType === 'img')
      .sort((a, b) => a.sort - b.sort)
      .map((item) => item.thumbUrl || item.url)
      .slice(0, 4)
  })

  const genderClass = computed(() => {
    const g = userInfo.value?.gender?.trim().toLowerCase()
    if (g === '女' || g === 'female' || g === 'f') return 'is-female'
    if (g === '男' || g === 'male' || g === 'm') return 'is-male'
    return ''
  })

  const genderIconHref = computed(() => {
    if (genderClass.value === 'is-male') return '#male'
    if (genderClass.value === 'is-female') return '#female'
    return ''
  })

  const groupInfo = computed(() => groupProfile.value?.info)

  const groupRemarkText = computed(() => {
    const member = groupProfile.value?.tops?.find((item) => item.userId === currentUserId.value)
    return member?.groupRemark?.trim() ?? ''
  })

  const groupAliasText = computed(() => {
    const member = groupProfile.value?.tops?.find((item) => item.userId === currentUserId.value)
    return member?.groupNickName?.trim() ?? ''
  })

  const groupIntroText = computed(() => groupInfo.value?.describe?.trim() ?? '')

  const enterpriseDescribe = computed(() => enterpriseInfo.value?.describe?.trim() ?? '')
</script>

<style scoped lang="scss">
  .avatar-profile-card__spin {
    width: 320px;
    max-width: calc(100vw - 24px);

    :deep(.n-spin-container),
    :deep(.n-spin-content) {
      width: 100%;
    }
  }

  .avatar-profile-card {
    width: 100%;
    box-sizing: border-box;
    padding: 20px 16px 16px;
    background: var(--bg-primary-color);
    border-radius: 10px;
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

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

    &__gender-icon {
      flex-shrink: 0;

      &.is-female {
        color: var(--pink);
      }

      &.is-male {
        color: var(--primary-color);
      }
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

    &__emotion {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      user-select: none;
    }

    &__meta-sep {
      margin: 0 4px;
      color: var(--text-muted-color);
    }

    &__divider {
      margin: 12px 0;
    }

    &__section-title {
      margin-bottom: 8px;
      font-size: 12px;
      color: var(--text-muted-color);
      user-select: none;
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

      &--moments {
        align-items: flex-start;
      }

      &--emotion {
        .avatar-profile-card__value-slot {
          display: flex;
          align-items: center;
        }
      }
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

      &.avatar-profile-card__emotion {
        display: inline-flex;
        align-items: center;
        width: auto;
      }
    }

    &__thumbs {
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      width: 100%;
    }

    &__thumb {
      flex: 1 1 0;
      min-width: 0;
      aspect-ratio: 1;
      border-radius: 4px;
      object-fit: cover;
      background: var(--bg-secondary-color);
    }

    &__actions {
      display: flex;
      align-items: center;
      margin: 16px -16px -16px;
      border-top: 1px solid var(--border-color);
      overflow: hidden;
      border-radius: 0 0 10px 10px;
    }

    &__action {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 0;
      height: 48px;
      padding: 0 10px;
      border: none;
      background: transparent;
      color: var(--text-color);
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      transition:
        color 0.15s ease,
        background-color 0.15s ease;

      &:hover {
        background: var(--button-soft-bg);
        color: var(--primary-color);

        .avatar-profile-card__action-icon {
          color: var(--primary-color);
        }
      }
    }

    &__action-icon {
      flex-shrink: 0;
      color: var(--text-secondary-color);
      transition: color 0.15s ease;
    }

    &__action-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      user-select: none;
    }

    &__action-sep {
      flex-shrink: 0;
      width: 1px;
      height: 18px;
      background: var(--border-color);
    }
  }
</style>
