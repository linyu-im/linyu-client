<template>
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
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  defineProps<{
    showCallActions: boolean
  }>()

  const { t } = useI18n()
</script>

<style scoped lang="scss">
  @use './avatarProfileCard.scss';
</style>
