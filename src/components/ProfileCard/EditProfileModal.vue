<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    :close-on-esc="false"
    transform-origin="center"
    @after-leave="resetForm">
    <div class="edit-profile">
      <div class="edit-profile__header">
        <span class="edit-profile__title">{{ t('editProfile.title') }}</span>
        <button type="button" class="edit-profile__close" @click="onClose">
          <svg class="size-18px"><use href="#close" /></svg>
        </button>
      </div>

      <div class="edit-profile__body">
        <button type="button" class="edit-profile__avatar-btn" @click="onAvatarClick">
          <img
            v-if="avatarPreviewSrc"
            class="edit-profile__avatar edit-profile__avatar--preview"
            :src="avatarPreviewSrc"
            alt="" />
          <Avatar
            v-else
            :id="userId"
            class="edit-profile__avatar"
            :profile-enabled="false"
            :refresh="true"
            round
            :size="88" />
        </button>

        <div class="edit-profile__form">
          <div class="edit-profile__field">
            <span class="edit-profile__label">{{ t('editProfile.nickname') }}</span>
            <n-input
              v-model:value="form.username"
              class="edit-profile__input"
              :maxlength="nicknameMax"
              show-count
              clearable />
          </div>

          <div class="edit-profile__field">
            <span class="edit-profile__label">{{ t('editProfile.signature') }}</span>
            <n-input
              v-model:value="form.signature"
              class="edit-profile__input"
              :placeholder="t('editProfile.signaturePlaceholder')"
              :maxlength="signatureMax"
              show-count
              clearable />
          </div>

          <div class="edit-profile__field">
            <span class="edit-profile__label">{{ t('editProfile.gender') }}</span>
            <n-select
              v-model:value="form.gender"
              class="edit-profile__select"
              :bordered="false"
              :options="genderOptions"
              :placeholder="t('editProfile.regionPlaceholder')"
              :consistent-menu-width="false" />
          </div>

          <div class="edit-profile__field">
            <span class="edit-profile__label">{{ t('editProfile.birthday') }}</span>
            <n-date-picker
              v-model:value="form.birthday"
              class="edit-profile__date"
              :bordered="false"
              type="date"
              clearable
              :default-value="null"
              :placeholder="t('editProfile.birthdayPlaceholder')"
              :actions="null"
              :is-date-disabled="() => false" />
          </div>

          <div class="edit-profile__field">
            <span class="edit-profile__label">{{ t('editProfile.country') }}</span>
            <n-select
              v-model:value="form.country"
              class="edit-profile__select"
              :bordered="false"
              :options="countryOptions"
              :consistent-menu-width="false"
              @update:value="onCountryChange" />
          </div>

          <div class="edit-profile__field-row">
            <div class="edit-profile__field edit-profile__field--half">
              <span class="edit-profile__label">{{ t('editProfile.province') }}</span>
              <n-select
                v-model:value="form.province"
                class="edit-profile__select"
                :bordered="false"
                :options="provinceOptions"
                :disabled="!isChina"
                :placeholder="t('editProfile.regionPlaceholder')"
                :consistent-menu-width="false"
                @update:value="onProvinceChange" />
            </div>
            <div class="edit-profile__field edit-profile__field--half">
              <span class="edit-profile__label">{{ t('editProfile.region') }}</span>
              <n-select
                v-model:value="form.region"
                class="edit-profile__select"
                :bordered="false"
                :options="regionOptions"
                :disabled="!form.province"
                :placeholder="t('editProfile.regionPlaceholder')"
                :consistent-menu-width="false" />
            </div>
          </div>
        </div>
      </div>

      <div class="edit-profile__footer">
        <n-button type="primary" round :loading="saving" :disabled="avatarUploading" @click="onSave">
          {{ t('editProfile.save') }}
        </n-button>
        <n-button round @click="onCancel">
          {{ t('editProfile.cancel') }}
        </n-button>
      </div>
    </div>
  </n-modal>

  <AvatarCropModal v-model:show="showAvatarCrop" :file-path="avatarCropPath" @save="onAvatarSave" />
</template>

<script setup lang="ts">
  import type { User } from '@/types/api/user'
  import { userApi } from '@/api'
  import { CHINA_CITIES, CHINA_PROVINCES, COUNTRY_OPTIONS } from '@/constants/region'
  import AvatarCropModal from '@/components/ProfileCard/AvatarCropModal.vue'
  import { useAvatarStore } from '@/stores/avatar'
  import { usePeerInfoStore } from '@/stores/peerInfo'
  import { useUserStore } from '@/stores/user'
  import { IMAGE_FILE_EXTENSIONS } from '@/utils/filePick'
  import { open } from '@tauri-apps/plugin-dialog'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  const props = defineProps<{
    userId: string
    userInfo: User | null
  }>()

  const { t } = useI18n()
  const avatarStore = useAvatarStore()
  const peerInfoStore = usePeerInfoStore()
  const userStore = useUserStore()

  const nicknameMax = 36
  const signatureMax = 100
  const saving = ref(false)
  const showAvatarCrop = ref(false)
  const avatarCropPath = ref('')
  const avatarPreviewSrc = ref('')
  const avatarUploading = ref(false)

  let avatarPreviewObjectUrl = ''

  const form = ref({
    username: '',
    signature: '',
    gender: null as string | null,
    birthday: null as number | null,
    country: null as string | null,
    province: null as string | null,
    region: null as string | null
  })

  const genderOptions = computed(() => [
    { label: t('contacts.gender.male'), value: 'male' },
    { label: t('contacts.gender.female'), value: 'female' }
  ])

  const countryOptions = computed(() =>
    COUNTRY_OPTIONS.map((item) => ({
      label: item.label,
      value: item.value
    }))
  )

  const isChina = computed(() => form.value.country === '中国')

  const provinceOptions = computed(() =>
    CHINA_PROVINCES.map((province) => ({
      label: province,
      value: province
    }))
  )

  const regionOptions = computed(() => {
    const province = form.value.province
    if (!province) return []
    const cities = CHINA_CITIES[province] ?? [province]
    return cities.map((city) => ({
      label: city,
      value: city
    }))
  })

  const normalizeGender = (gender?: string | null) => {
    const value = gender?.trim().toLowerCase() ?? ''
    if (value === '男' || value === 'male' || value === 'm') return 'male'
    if (value === '女' || value === 'female' || value === 'f') return 'female'
    return null
  }

  const parseBirthday = (birthday?: string | null) => {
    const text = birthday?.trim() ?? ''
    if (!text) return null

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return null

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    if (year < 1900) return null

    const date = new Date(year, month - 1, day)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null
    }

    return date.getTime()
  }

  const parseLocation = (location?: string | null) => {
    const text = location?.trim() ?? ''
    if (!text) {
      return { country: '中国' as string | null, province: null as string | null, region: null as string | null }
    }

    const parts = text.split(/\s+/).filter(Boolean)
    const country = COUNTRY_OPTIONS.some((item) => item.value === parts[0]) ? parts[0] : '中国'
    const locationParts = country === parts[0] ? parts.slice(1) : parts
    const province = locationParts.find((part) => CHINA_PROVINCES.includes(part)) ?? null
    const region = locationParts.find((part) => part !== province) ?? null

    return { country, province, region }
  }

  const fillForm = () => {
    const info = props.userInfo
    const location = parseLocation(info?.location)
    form.value = {
      username: info?.username ?? '',
      signature: info?.signature?.trim() ?? '',
      gender: normalizeGender(info?.gender),
      birthday: parseBirthday(info?.birthday),
      country: location.country,
      province: location.province,
      region: location.region
    }
  }

  const revokeAvatarPreviewObjectUrl = () => {
    if (!avatarPreviewObjectUrl) return
    URL.revokeObjectURL(avatarPreviewObjectUrl)
    avatarPreviewObjectUrl = ''
  }

  const resetForm = () => {
    form.value = {
      username: '',
      signature: '',
      gender: null,
      birthday: null,
      country: null,
      province: null,
      region: null
    }
    revokeAvatarPreviewObjectUrl()
    avatarPreviewSrc.value = ''
    avatarCropPath.value = ''
    showAvatarCrop.value = false
    avatarUploading.value = false
    saving.value = false
  }

  const onCountryChange = () => {
    form.value.province = null
    form.value.region = null
  }

  const onProvinceChange = () => {
    form.value.region = null
  }

  const onClose = () => {
    visible.value = false
  }

  const onCancel = () => {
    onClose()
  }

  const formatBirthday = (timestamp: number | null) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const buildLocation = () => {
    const { country, province, region } = form.value
    return [country, province, region].filter((item) => item?.trim()).join(' ')
  }

  const buildUpdatePayload = () => ({
    username: form.value.username.trim(),
    gender: form.value.gender ?? '',
    birthday: formatBirthday(form.value.birthday),
    signature: form.value.signature.trim(),
    location: buildLocation()
  })

  const onSave = () => {
    if (saving.value || avatarUploading.value) return

    const payload = buildUpdatePayload()
    if (!payload.username) {
      window.$message.error(t('editProfile.nicknameRequired'))
      return
    }

    saving.value = true
    userApi
      .updateProfile(payload)
      .then((res) => {
        if (res.code === 0) {
          peerInfoStore.patchUser(props.userId, {
            username: payload.username,
            gender: payload.gender,
            birthday: payload.birthday,
            signature: payload.signature,
            location: payload.location
          })

          const currentUserId = userStore.userInfo?.id || userStore.authInfo?.userId || ''
          if (props.userId && props.userId === currentUserId) {
            userStore.setUserInfo({
              ...userStore.userInfo,
              username: payload.username,
              gender: payload.gender,
              birthday: payload.birthday,
              signature: payload.signature,
              location: payload.location
            })
          }

          peerInfoStore.fetchUser(props.userId)
          window.$message.success(t('editProfile.saveSuccess'))
          visible.value = false
          return
        }
        window.$message.error(res.msg)
      })
      .catch(() => {
        window.$message.error(t('editProfile.saveFailed'))
      })
      .finally(() => {
        saving.value = false
      })
  }

  const onAvatarClick = () => {
    open({
      multiple: false,
      title: t('avatarCrop.pickTitle'),
      filters: [{ name: 'Images', extensions: IMAGE_FILE_EXTENSIONS }]
    }).then((selected) => {
      if (!selected || Array.isArray(selected)) return
      avatarCropPath.value = selected
      showAvatarCrop.value = true
    })
  }

  const bustCache = (url: string) => {
    if (!url) return url
    return url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
  }

  const onAvatarSave = (blob: Blob) => {
    if (avatarUploading.value) return
    avatarUploading.value = true
    revokeAvatarPreviewObjectUrl()
    avatarPreviewObjectUrl = URL.createObjectURL(blob)
    avatarPreviewSrc.value = avatarPreviewObjectUrl

    userApi
      .uploadAvatar(blob)
      .then((res) => {
        if (res.code === 0 && res.data) {
          revokeAvatarPreviewObjectUrl()
          return avatarStore.updateAvatarFromRemote('user', props.userId, res.data).then((url) => {
            if (url) {
              avatarPreviewSrc.value = bustCache(url)
            }
          })
        }
        window.$message.error(res.msg)
      })
      .catch(() => {
        nextTick(() => {
          window.$message.error(t('avatarCrop.uploadFailed'))
        })
      })
      .finally(() => {
        avatarUploading.value = false
      })
  }

  onBeforeUnmount(() => {
    revokeAvatarPreviewObjectUrl()
  })

  watch(visible, (show) => {
    if (show) {
      fillForm()
    }
  })
</script>

<style scoped lang="scss">
  .edit-profile {
    display: flex;
    flex-direction: column;
    width: 600px;
    max-width: 92vw;
    max-height: 90vh;
    background: var(--bg-secondary-color);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    overflow: hidden;

    &__header {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 56px;
      padding: 0 48px;
      border-bottom: 1px solid var(--divider-color);
    }

    &__title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
    }

    &__close {
      position: absolute;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        color: var(--text-color);
      }
    }

    &__body {
      flex: 1;
      min-height: 0;
      padding: 24px 28px 8px;
      overflow-y: auto;
    }

    &__avatar-btn {
      display: block;
      margin: 0 auto 24px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 50%;
    }

    &__avatar {
      border: 3px solid var(--bg-primary-color);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      &--preview {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        object-fit: cover;
      }
    }

    &__form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    &__field-row {
      display: flex;
      gap: 12px;
    }

    &__field {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 14px;
      background: var(--bg-primary-color);
      border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      border-radius: 10px;

      &--half {
        flex: 1;
        min-width: 0;
      }
    }

    &__label {
      flex-shrink: 0;
      width: 42px;
      font-size: 14px;
      color: var(--text-color);
      user-select: none;
    }

    &__input {
      flex: 1;
      min-width: 0;
      --n-border: none;
      --n-border-hover: none;
      --n-border-focus: none;
      --n-box-shadow-focus: none;
      background-color: transparent !important;

      &:hover,
      &.n-input--focus,
      &.n-input--disabled {
        background-color: transparent !important;
      }

      :deep(.n-input__border),
      :deep(.n-input__state-border) {
        display: none;
      }

      :deep(.n-input-wrapper) {
        padding-left: 0;
        padding-right: 0;
        background-color: transparent !important;
      }

      :deep(.n-input__input-el),
      :deep(.n-input__textarea-el) {
        background-color: transparent !important;
        font-size: 14px;
        color: var(--text-color);
      }

      :deep(.n-input__placeholder) {
        color: var(--text-muted-color);
      }

      :deep(.n-input-count) {
        font-size: 12px;
        color: var(--text-muted-color);
      }
    }

    &__select {
      flex: 1;
      min-width: 0;

      :deep(.n-base-selection) {
        --n-border: none;
        --n-border-hover: none;
        --n-border-active: none;
        --n-border-focus: none;
        --n-box-shadow-active: none;
        --n-box-shadow-focus: none;
        --n-color: transparent;
        --n-color-active: transparent;
        --n-color-disabled: transparent;
        --n-text-color: var(--text-color);
        --n-text-color-disabled: var(--text-muted-color);
        --n-placeholder-color: var(--text-secondary-color);
        --n-arrow-color: var(--text-secondary-color);
        --n-height: 44px;
        --n-padding-single: 0 24px 0 0;
        --n-padding-multiple: 3px 24px 0 0;
        background: transparent;
      }

      :deep(.n-base-selection-label) {
        background: transparent;
      }

      :deep(.n-base-selection-placeholder) {
        color: var(--text-secondary-color);
      }

      :deep(.n-base-selection:hover .n-base-selection-label),
      :deep(.n-base-selection.n-base-selection--active .n-base-selection-label),
      :deep(.n-base-selection.n-base-selection--focus .n-base-selection-label) {
        background: transparent;
      }
    }

    &__date {
      flex: 1;
      min-width: 0;

      :deep(.n-input) {
        --n-border: none;
        --n-border-hover: none;
        --n-border-focus: none;
        --n-box-shadow-focus: none;
        --n-text-color: var(--text-color);
        --n-placeholder-color: var(--text-secondary-color);
        --n-icon-color: var(--text-secondary-color);
        --n-icon-color-hover: var(--text-secondary-color);
        --n-icon-color-pressed: var(--text-secondary-color);
        --n-clear-color: var(--text-secondary-color);
        --n-clear-color-hover: var(--text-color);
        --n-clear-color-pressed: var(--text-color);
        --n-height: 44px;
        --n-padding-right: 24px;
        --n-icon-size: 16px;
        background-color: transparent !important;
      }

      :deep(.n-input:hover),
      :deep(.n-input.n-input--focus),
      :deep(.n-input.n-input--disabled) {
        background-color: transparent !important;
      }

      :deep(.n-input__border),
      :deep(.n-input__state-border) {
        display: none;
      }

      :deep(.n-input-wrapper) {
        position: relative;
        padding-left: 0;
        padding-right: 24px;
        background-color: transparent !important;
      }

      :deep(.n-input__suffix) {
        position: absolute;
        top: 50%;
        right: 10px;
        margin-left: 0;
        transform: translateY(-50%);
      }

      :deep(.n-date-picker-icon),
      :deep(.n-input__suffix .n-base-icon) {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }

      :deep(.n-input__input-el) {
        background-color: transparent !important;
        font-size: 14px;
        color: var(--text-color);
      }

      :deep(.n-input__placeholder) {
        color: var(--text-secondary-color);
      }
    }

    &__footer {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 28px 24px;
    }
  }
</style>
