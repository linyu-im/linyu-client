<template>
  <div class="moment-cover">
    <n-spin :show="loading" class="moment-cover__spin">
      <img class="moment-cover__img" :src="userInfo?.momentBgUrl" alt="" />
      <div class="moment-cover__overlay" />
      <div v-if="userInfo" class="moment-cover__info">
        <div class="moment-cover__user">
          <Avatar :id="userId" class="moment-cover__avatar size-72px rounded-16px bg-#FFF" />
          <div class="h-60px select-none">
            <div class="moment-cover__name">{{ userInfo.username }}</div>
            <div class="moment-cover__signature">{{ userInfo.signature }}</div>
          </div>
        </div>
        <div class="moment-cover__actions">
          <n-tooltip :show-arrow="false">
            <template #trigger>
              <button type="button" class="moment-cover__btn" @click="emit('changeCover')">
                <svg class="size-16px">
                  <use href="#image"></use>
                </svg>
              </button>
            </template>
            {{ t('moment.cover.changeCover') }}
          </n-tooltip>
          <n-tooltip :show-arrow="false">
            <template #trigger>
              <button type="button" class="moment-cover__btn" @click="emit('settings')">
                <svg class="size-16px"><use href="#settings"></use></svg>
              </button>
            </template>
            {{ t('moment.cover.settings') }}
          </n-tooltip>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
  import { userApi } from '@/api'
  import type { UserInfoResult } from '@/types/api/user'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    userId: string
  }>()

  const emit = defineEmits<{
    changeCover: []
    settings: []
  }>()

  const { t } = useI18n()
  const loading = ref(false)
  const userInfo = ref<UserInfoResult | null>(null)

  const fetchUserInfo = () => {
    if (!props.userId) {
      userInfo.value = null
      return
    }

    loading.value = true
    userApi
      .getUserInfo({ userId: props.userId })
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
  }

  watch(() => props.userId, fetchUserInfo, { immediate: true })
</script>

<style scoped lang="scss">
  .moment-cover {
    position: relative;
    width: 100%;
    height: 280px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid var(--border-color);

    &__spin {
      width: 100%;
      height: 100%;

      :deep(.n-spin-container) {
        width: 100%;
        height: 100%;
      }

      :deep(.n-spin-content) {
        width: 100%;
        height: 100%;
        position: relative;
      }
    }

    &__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &__overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        color-mix(in srgb, var(--bg-secondary-color) 5%, transparent) 0%,
        transparent 35%,
        transparent 55%,
        color-mix(in srgb, var(--bg-secondary-color) 28%, transparent) 78%,
        color-mix(in srgb, var(--bg-secondary-color) 65%, transparent) 100%
      );
      pointer-events: none;
    }

    &__info {
      position: absolute;
      bottom: 20px;
      left: 24px;
      right: 24px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }

    &__user {
      display: flex;
      align-items: flex-end;
      gap: 16px;
    }

    &__avatar {
      border: 3px solid var(--bg-secondary-color);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }

    &__name {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      letter-spacing: -0.3px;
      margin-bottom: 10px;
    }

    &__signature {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.75);
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    &__actions {
      display: flex;
      gap: 8px;
    }

    &__btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      transition: background 0.2s;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }
</style>
