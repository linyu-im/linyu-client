<template>
  <div>
    <div v-show="!showEditProfile">
      <div class="profile-card__head">
        <div class="profile-card__avatar-wrap" @click.stop="onAvatarPreview">
          <Avatar class="profile-card__avatar shrink-0" :id="id" :profile-enabled="false" :refresh="true" />
        </div>
        <div class="profile-card__head-main min-w-0 flex-1">
          <div class="profile-card__title-row">
            <div class="profile-card__title truncate">
              {{ displayName }}
              <svg v-if="genderIconHref" class="profile-card__gender-icon size-14px" :class="genderClass">
                <use :href="genderIconHref" />
              </svg>
            </div>
          </div>
          <div class="profile-card__brief-row">
            <span class="profile-card__brief-label">{{ t('avatarProfile.nickname') }}</span>
            <span class="profile-card__brief-value truncate">{{ userInfo?.username ?? '' }}</span>
          </div>
          <div class="profile-card__brief-row">
            <span class="profile-card__brief-label">{{ t('contacts.fields.linyuId') }}</span>
            <span class="profile-card__brief-value truncate">{{ userInfo?.account ?? '' }}</span>
          </div>
          <div v-if="locationText" class="profile-card__brief-row">
            <span class="profile-card__brief-label">{{ t('avatarProfile.region') }}</span>
            <span class="profile-card__brief-value truncate">{{ locationText }}</span>
          </div>
        </div>
      </div>

      <n-divider class="profile-card__divider" />

      <div class="profile-card__section-title">{{ t('avatarProfile.friendProfile') }}</div>
      <div class="profile-card__meta">
        <div v-if="emotionName" class="profile-card__row profile-card__row--emotion">
          <span class="profile-card__row-label">{{ t('avatarProfile.emotion') }}</span>
          <div class="profile-card__value-slot">
            <span class="profile-card__row-value profile-card__emotion">
              <span>[</span>
              <img v-if="emotionUrl" class="size-14px" :src="emotionUrl" alt="" />
              <span>{{ emotionName }}</span>
              <span>]</span>
            </span>
          </div>
        </div>
        <div v-if="remarkText" class="profile-card__row">
          <span class="profile-card__row-label">{{ t('contacts.fields.remark') }}</span>
          <div class="profile-card__value-slot">
            <span class="profile-card__row-value profile-card__row-value--ellipsis">
              {{ remarkText }}
            </span>
          </div>
        </div>
        <div v-if="tagText" class="profile-card__row">
          <span class="profile-card__row-label">{{ t('contacts.fields.tag') }}</span>
          <div class="profile-card__value-slot">
            <span class="profile-card__row-value profile-card__row-value--ellipsis">{{ tagText }}</span>
          </div>
        </div>
        <div v-if="signatureText" class="profile-card__row">
          <span class="profile-card__row-label">{{ t('contacts.fields.signature') }}</span>
          <div class="profile-card__value-slot">
            <span class="profile-card__row-value profile-card__row-value--ellipsis">
              {{ signatureText }}
            </span>
          </div>
        </div>
        <div v-if="momentThumbs.length > 0" class="profile-card__row profile-card__row--moments">
          <span class="profile-card__row-label">{{ t('contacts.fields.friendMoments') }}</span>
          <div class="profile-card__value-slot">
            <div class="profile-card__thumbs">
              <img
                v-for="(url, index) in momentThumbs"
                :key="`${url}-${index}`"
                class="profile-card__thumb"
                :src="url"
                alt="" />
            </div>
          </div>
        </div>
      </div>

      <div class="profile-card__actions">
        <template v-if="!isSelf && !isFriend">
          <button type="button" class="profile-card__action">
            <svg class="profile-card__action-icon size-18px">
              <use href="#plus" />
            </svg>
            <span class="profile-card__action-label">{{ t('avatarProfile.addFriend') }}</span>
          </button>
        </template>
        <template v-else>
          <button type="button" class="profile-card__action" :disabled="sendingMessage" @click="onSendMessage">
            <svg class="profile-card__action-icon size-18px">
              <use href="#message" />
            </svg>
            <span class="profile-card__action-label">{{ t('contacts.actions.sendMessage') }}</span>
          </button>
          <template v-if="isSelf">
            <span class="profile-card__action-sep" aria-hidden="true" />
            <button type="button" class="profile-card__action" @click="showEditProfile = true">
              <svg class="profile-card__action-icon size-18px">
                <use href="#edit" />
              </svg>
              <span class="profile-card__action-label">{{ t('avatarProfile.editProfile') }}</span>
            </button>
          </template>
          <template v-else>
            <span class="profile-card__action-sep" aria-hidden="true" />
            <button type="button" class="profile-card__action">
              <svg class="profile-card__action-icon size-18px">
                <use href="#phone" />
              </svg>
              <span class="profile-card__action-label">{{ t('avatarProfile.voiceChat') }}</span>
            </button>
            <span class="profile-card__action-sep" aria-hidden="true" />
            <button type="button" class="profile-card__action">
              <svg class="profile-card__action-icon size-18px">
                <use href="#video" />
              </svg>
              <span class="profile-card__action-label">{{ t('avatarProfile.videoChat') }}</span>
            </button>
          </template>
        </template>
      </div>
    </div>

    <EditProfileModal v-model:show="showEditProfile" :user-id="id" :user-info="userInfo" />
  </div>
</template>

<script setup lang="ts">
  import type { User } from '@/types/api/user'
  import { contactsApi } from '@/api'
  import EditProfileModal from '@/components/ProfileCard/EditProfileModal.vue'
  import { SceneType } from '@/constants/common'
  import { useAvatarStore } from '@/stores/avatar'
  import { useHomeTabStore } from '@/stores/homeTab'
  import { useUserStore } from '@/stores/user'
  import { openImgViewer } from '@/utils/imgViewer'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    id: string
    userInfo: User | null
  }>()

  const emit = defineEmits<{
    'update:editProfileShow': [show: boolean]
  }>()

  const { t } = useI18n()
  const userStore = useUserStore()
  const avatarStore = useAvatarStore()
  const homeTabStore = useHomeTabStore()

  const sendingMessage = ref(false)

  const currentUserId = computed(() => userStore.userInfo?.id || userStore.authInfo?.userId || '')
  const isSelf = computed(() => props.id === currentUserId.value)
  const isFriend = ref(false)
  const showEditProfile = ref(false)

  watch(
    showEditProfile,
    (show) => {
      emit('update:editProfileShow', show)
    },
    { immediate: true }
  )

  const checkIsFriend = () => {
    if (!props.id || isSelf.value) return
    contactsApi.isFriend({ userId: props.id }).then((res) => {
      if (res.code === 0) {
        isFriend.value = res.data ?? false
      }
    })
  }

  watch(
    () => props.id,
    () => {
      isFriend.value = false
      checkIsFriend()
    },
    { immediate: true }
  )

  const displayName = computed(() => {
    const info = props.userInfo
    if (!info) return ''
    return info.remark?.trim() || info.username || ''
  })

  const onAvatarPreview = () => {
    if (!props.id) return
    avatarStore.resolveSrc('user', props.id).then((url) => {
      if (!url) return
      openImgViewer([{ url, name: displayName.value }], 0)
    })
  }

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
    if (g === '?' || g === 'female' || g === 'f') return 'is-female'
    if (g === '?' || g === 'male' || g === 'm') return 'is-male'
    return ''
  })

  const genderIconHref = computed(() => {
    if (genderClass.value === 'is-male') return '#male'
    if (genderClass.value === 'is-female') return '#female'
    return ''
  })

  const onSendMessage = () => {
    if (sendingMessage.value || !props.id) return

    sendingMessage.value = true
    homeTabStore.openMessageWithPeer(props.id, SceneType.User).finally(() => {
      sendingMessage.value = false
    })
  }
</script>

<style scoped lang="scss">
  @use './profileCard.scss';
</style>
