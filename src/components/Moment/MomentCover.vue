<template>
  <div class="moment-cover">
    <n-spin :show="loading || uploading" class="moment-cover__spin">
      <img class="moment-cover__img" :src="coverSrc" alt="" />
      <div class="moment-cover__overlay" />

      <div v-if="userInfo" class="moment-cover__info">
        <div class="moment-cover__user">
          <Avatar :id="userId" class="moment-cover__avatar size-72px rounded-16px" />
          <div class="moment-cover__meta">
            <div class="moment-cover__name">{{ userInfo.username }}</div>
            <div class="moment-cover__signature">{{ userInfo.signature }}</div>
          </div>
        </div>

        <div v-if="isOwner" class="moment-cover__actions">
          <n-tooltip :show-arrow="false">
            <template #trigger>
              <button type="button" class="moment-cover__btn" :disabled="uploading" @click="onChangeCover">
                <svg class="moment-cover__btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="#image"></use>
                </svg>
              </button>
            </template>
            {{ t('moment.cover.changeCover') }}
          </n-tooltip>

          <n-tooltip :show-arrow="false">
            <template #trigger>
              <button type="button" class="moment-cover__btn" @click="emit('settings')">
                <svg class="moment-cover__btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <use href="#settings"></use>
                </svg>
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
  import { momentApi } from '@/api'
  import { usePeerInfoStore } from '@/stores/user/peerInfo'
  import { useUserStore } from '@/stores/user/user'
  import type { User } from '@/types/api/user'
  import { IMAGE_FILE_EXTENSIONS } from '@/utils/file/filePick'
  import { open } from '@tauri-apps/plugin-dialog'
  import { readFile } from '@tauri-apps/plugin-fs'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{
    userId: string
  }>()

  const emit = defineEmits<{
    settings: []
  }>()

  const { t } = useI18n()
  const peerInfoStore = usePeerInfoStore()
  const userStore = useUserStore()

  const uploading = ref(false)
  const settingLoading = ref(false)
  const bgUrl = ref('')
  const coverCacheKey = ref(0)

  const userInfo = computed(() => peerInfoStore.read(props.userId, 'user') as User | null)
  const isOwner = computed(() => !!props.userId && props.userId === userStore.userInfo.id)
  const loading = computed(() => settingLoading.value || (!!props.userId && !userInfo.value))

  const bustCache = (url: string, key: number) => {
    if (!url) return url
    return url + (url.includes('?') ? '&' : '?') + '_t=' + key
  }

  const coverSrc = computed(() => {
    if (!bgUrl.value) return ''
    return coverCacheKey.value > 0 ? bustCache(bgUrl.value, coverCacheKey.value) : bgUrl.value
  })

  const fetchSetting = () => {
    if (!props.userId) {
      bgUrl.value = ''
      return
    }

    settingLoading.value = true
    momentApi
      .getSetting({ userId: props.userId })
      .then((res) => {
        if (res.code === 0 && res.data) {
          bgUrl.value = res.data.bgUrl || ''
          return
        }
        window.$message.error(res.msg)
      })
      .finally(() => {
        settingLoading.value = false
      })
  }

  const onChangeCover = () => {
    if (uploading.value) return

    open({
      multiple: false,
      title: t('moment.cover.pickTitle'),
      filters: [{ name: 'Images', extensions: IMAGE_FILE_EXTENSIONS }]
    }).then((selected) => {
      if (!selected || Array.isArray(selected)) return

      const path = selected
      const fileName = path.replace(/^.*[/\\]/, '') || 'background.jpg'
      uploading.value = true

      readFile(path)
        .then((bytes) => momentApi.uploadBackground(new Blob([bytes]), fileName))
        .then((res) => {
          if (res.code === 0) {
            return momentApi.getSetting({ userId: props.userId }).then((settingRes) => {
              if (settingRes.code === 0 && settingRes.data) {
                bgUrl.value = settingRes.data.bgUrl || ''
                coverCacheKey.value = Date.now()
                window.$message.success(t('moment.cover.uploadSuccess'))
                return
              }
              window.$message.error(settingRes.msg || t('moment.cover.uploadFailed'))
            })
          }
          window.$message.error(res.msg || t('moment.cover.uploadFailed'))
        })
        .catch(() => {
          window.$message.error(t('moment.cover.uploadFailed'))
        })
        .finally(() => {
          uploading.value = false
        })
    })
  }

  watch(
    () => props.userId,
    (userId) => {
      if (!userId) return
      peerInfoStore.get(userId, 'user')
      fetchSetting()
    },
    { immediate: true }
  )
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
        rgba(7, 10, 18, 0.02) 0%,
        rgba(7, 10, 18, 0) 46%,
        rgba(7, 10, 18, 0.08) 66%,
        rgba(7, 10, 18, 0.42) 100%
      );
      pointer-events: none;
    }

    &__info {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 96px;
      padding: 32px 24px 20px;
      background: linear-gradient(
        to bottom,
        rgba(7, 10, 18, 0) 0%,
        rgba(7, 10, 18, 0.18) 42%,
        rgba(7, 10, 18, 0.52) 100%
      );
    }

    &__user {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }

    &__meta {
      min-width: 0;
      flex: 1;
      user-select: none;
    }

    &__avatar {
      flex-shrink: 0;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
    }

    &__name {
      overflow: hidden;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      color: #fff;
      text-overflow: ellipsis;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.34);
      white-space: nowrap;
      letter-spacing: -0.3px;
    }

    &__signature {
      overflow: hidden;
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.35;
      color: rgba(255, 255, 255, 0.8);
      text-overflow: ellipsis;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
      white-space: nowrap;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    &__btn {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      padding: 0;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.03);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      transition:
        background 0.2s,
        transform 0.2s,
        border-color 0.2s;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    &__btn-icon {
      width: 16px;
      height: 16px;
      display: block;
      flex-shrink: 0;
      pointer-events: none;
    }
  }
</style>
