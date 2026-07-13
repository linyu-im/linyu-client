<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    :close-on-esc="false"
    transform-origin="center"
    @after-leave="resetForm">
    <div v-if="groupInfo" class="edit-group-profile">
      <div class="edit-group-profile__header">
        <span class="edit-group-profile__title">{{ t('message.chatSettings.group.profileSettings') }}</span>
        <button type="button" class="edit-group-profile__close" @click="onClose">
          <svg class="size-18px"><use href="#close" /></svg>
        </button>
      </div>

      <div class="edit-group-profile__body">
        <button type="button" class="edit-group-profile__avatar-btn" @click="onAvatarClick">
          <img
            v-if="avatarPreviewSrc"
            class="edit-group-profile__avatar edit-group-profile__avatar--preview"
            :src="avatarPreviewSrc"
            alt="" />
          <Avatar
            v-else
            :id="groupInfo.info.id"
            type="group"
            class="edit-group-profile__avatar"
            :profile-enabled="false"
            round
            :size="88" />
          <span class="edit-group-profile__avatar-overlay" aria-hidden="true">
            <svg class="edit-group-profile__avatar-icon">
              <use href="#image" />
            </svg>
          </span>
        </button>

        <div class="edit-group-profile__form">
          <div class="edit-group-profile__field">
            <span class="edit-group-profile__label">{{ t('message.chatSettings.group.groupName') }}</span>
            <n-input
              v-model:value="form.name"
              class="edit-group-profile__input"
              :maxlength="groupNameMax"
              show-count
              clearable />
          </div>

          <div class="edit-group-profile__field edit-group-profile__field--textarea">
            <span class="edit-group-profile__label">{{ t('message.chatSettings.group.groupIntro') }}</span>
            <div class="edit-group-profile__textarea-wrap">
              <n-input
                v-model:value="form.describe"
                class="edit-group-profile__input edit-group-profile__input--textarea"
                type="textarea"
                :rows="3"
                :resizable="false"
                :placeholder="t('message.chatSettings.group.notSet')"
                :maxlength="introMax" />
              <div class="edit-group-profile__textarea-bar">
                <span class="edit-group-profile__textarea-count">{{ introLength }} / {{ introMax }}</span>
              </div>
            </div>
          </div>

          <div class="edit-group-profile__field edit-group-profile__field--tags">
            <span class="edit-group-profile__label">{{ t('message.chatSettings.group.groupTags') }}</span>
            <n-select
              v-model:value="form.tags"
              class="edit-group-profile__select"
              filterable
              multiple
              tag
              :bordered="false"
              :show-arrow="false"
              :show="false"
              :placeholder="t('message.chatSettings.group.tagsPlaceholder')"
              :consistent-menu-width="false" />
          </div>
        </div>
      </div>

      <div class="edit-group-profile__footer">
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
  import { useI18n } from 'vue-i18n'
  import { open } from '@tauri-apps/plugin-dialog'
  import { groupApi } from '@/api'
  import AvatarCropModal from '@/components/Modal/AvatarCropModal.vue'
  import { useAvatarStore } from '@/stores/user/avatar'
  import { useChatStore } from '@/stores/chat/chat'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import type { GroupInfoResult } from '@/types/api/group'
  import { IMAGE_FILE_EXTENSIONS } from '@/utils/filePick'

  const visible = defineModel<boolean>('show', { default: false })

  const props = defineProps<{
    groupInfo: GroupInfoResult
  }>()

  const { t } = useI18n()
  const avatarStore = useAvatarStore()
  const peerInfoStore = usePeerInfoStore()
  const chatStore = useChatStore()

  const groupNameMax = 36
  const introMax = 200
  const saving = ref(false)
  const showAvatarCrop = ref(false)
  const avatarCropPath = ref('')
  const avatarPreviewSrc = ref('')
  const avatarUploading = ref(false)

  let avatarPreviewObjectUrl = ''

  interface GroupProfileForm {
    name: string
    describe: string
    tags: string[]
  }

  const form = ref<GroupProfileForm>({
    name: '',
    describe: '',
    tags: []
  })

  const fillForm = () => {
    form.value = {
      name: props.groupInfo.info.name ?? '',
      describe: props.groupInfo.info.describe?.trim() ?? '',
      tags: []
    }
  }

  const introLength = computed(() => form.value.describe.length)

  const revokeAvatarPreviewObjectUrl = () => {
    if (!avatarPreviewObjectUrl) return
    URL.revokeObjectURL(avatarPreviewObjectUrl)
    avatarPreviewObjectUrl = ''
  }

  const resetForm = () => {
    form.value = {
      name: '',
      describe: '',
      tags: []
    }
    revokeAvatarPreviewObjectUrl()
    avatarPreviewSrc.value = ''
    avatarCropPath.value = ''
    showAvatarCrop.value = false
    avatarUploading.value = false
    saving.value = false
  }

  const onClose = () => {
    visible.value = false
  }

  const onCancel = () => {
    onClose()
  }

  const onSave = () => {
    if (saving.value || avatarUploading.value) return

    const name = form.value.name.trim()
    if (!name) {
      window.$message.error(t('message.chatSettings.group.nameRequired'))
      return
    }

    saving.value = true
    groupApi
      .updateInfo({
        groupId: props.groupInfo.info.id,
        name: form.value.name.trim(),
        describe: form.value.describe.trim(),
        tag: form.value.tags.join(',')
      })
      .then((res) => {
        if (res.code === 0) {
          peerInfoStore.refreshGroup(props.groupInfo.info.id)
          chatStore.refreshList()
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

    groupApi
      .uploadAvatar(blob, props.groupInfo.info.id)
      .then((res) => {
        if (res.code === 0 && res.data) {
          revokeAvatarPreviewObjectUrl()
          return avatarStore.updateAvatarFromRemote('group', props.groupInfo.info.id, res.data).then((url) => {
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
  .edit-group-profile {
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
      position: relative;
      display: block;
      margin: 0 auto 24px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 50%;
      overflow: hidden;

      &:hover .edit-group-profile__avatar-overlay {
        opacity: 1;
      }
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

    &__avatar-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &__avatar-icon {
      width: 24px;
      height: 24px;
    }

    &__form {
      display: flex;
      flex-direction: column;
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

      &--textarea {
        align-items: flex-start;
        padding: 10px 14px;

        .edit-group-profile__label {
          line-height: 22px;
        }
      }

      &--tags {
        align-items: center;
      }
    }

    &__textarea-wrap {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__textarea-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      min-height: 18px;
    }

    &__textarea-count {
      font-size: 12px;
      line-height: 1;
      color: var(--text-muted-color);
    }

    &__label {
      flex-shrink: 0;
      width: 70px;
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

      &--textarea {
        :deep(.n-input-wrapper) {
          padding: 0;
        }

        :deep(.n-input__textarea-el) {
          width: 100%;
          padding: 0;
          margin: 0;
          line-height: 22px;
          resize: none;
          box-sizing: border-box;
        }

        :deep(.n-input__placeholder) {
          top: 0 !important;
          left: 0;
          right: 0;
          padding: 0;
          line-height: 22px;
          transform: none !important;
        }

        :deep(.n-input__suffix),
        :deep(.n-input-count) {
          display: none;
        }
      }
    }

    &__select {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      align-self: stretch;

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
        --n-placeholder-color: var(--text-muted-color);
        --n-arrow-color: var(--text-secondary-color);
        --n-height: 34px;
        --n-padding-single: 0;
        --n-padding-multiple: 0;
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 34px;
        background: transparent;
      }

      :deep(.n-base-selection-label) {
        display: flex;
        align-items: center;
        background: transparent;
      }

      :deep(.n-base-selection-placeholder) {
        color: var(--text-muted-color);
      }

      :deep(.n-base-selection:hover .n-base-selection-label),
      :deep(.n-base-selection.n-base-selection--active .n-base-selection-label),
      :deep(.n-base-selection.n-base-selection--focus .n-base-selection-label) {
        background: transparent;
      }

      :deep(.n-base-selection-input) {
        font-size: 14px;
        line-height: 22px;
      }

      :deep(.n-base-selection-tags) {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        width: 100%;
        min-height: 24px;
        padding: 0;
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
