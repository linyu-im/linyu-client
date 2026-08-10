<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    :close-on-esc="false"
    transform-origin="center"
    :auto-focus="false">
    <div class="update-modal">
      <div class="update-modal__decor">
        <div class="update-modal__decor-circle update-modal__decor-circle--1" />
        <div class="update-modal__decor-circle update-modal__decor-circle--2" />
      </div>
      <div class="update-modal__header">
        <div class="update-modal__title">{{ t('update.title') }}</div>
        <div class="update-modal__versions">
          <i18n-t :keypath="versionLineKey" tag="span" class="update-modal__versions-line">
            <template #current>
              <span>{{ currentVersion || '-' }}</span>
            </template>
            <template #arrow>
              <svg class="update-modal__arrow" aria-hidden="true">
                <use href="#left-arrow" />
              </svg>
            </template>
            <template #latest>
              <span class="update-modal__latest">{{ version || '-' }}</span>
            </template>
          </i18n-t>
        </div>
      </div>
      <div v-if="description" class="update-modal__desc">{{ description }}</div>
      <div v-if="stage === 'error'" class="update-modal__error">
        <svg class="update-modal__error-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M15 9l-6 6M9 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>{{ t('update.downloadFailed') }}</span>
      </div>
      <div v-else-if="showProgress" class="update-modal__progress">
        <n-progress
          type="line"
          :percentage="progressPercent"
          :show-indicator="true"
          :height="8"
          :border-radius="4"
          :fill-border-radius="4"
          :status="progressStatus" />
        <div class="update-modal__progress-text">{{ progressText }}</div>
      </div>
      <div class="update-modal__footer">
        <n-button v-if="stage === 'downloading'" size="medium" :bordered="false" @click="onCancel">
          {{ t('update.cancel') }}
        </n-button>
        <n-button v-else-if="canLater && stage !== 'installing'" size="medium" :bordered="false" @click="onLater">
          {{ t('update.later') }}
        </n-button>
        <n-button type="primary" size="medium" :loading="busy" :disabled="busy" @click="onPrimary">
          {{ stage === 'installing' ? t('update.installing') : primaryLabel }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useAppUpdateStore } from '@/stores/app/appUpdate'
  import { getAppVersion } from '@/utils/app/version'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  const { t } = useI18n()
  const appUpdateStore = useAppUpdateStore()
  const { checkResult, stage, progress, needForce } = storeToRefs(appUpdateStore)

  const version = computed(() => checkResult.value?.latestVersion || '')
  const description = computed(() => checkResult.value?.updateDesc || '')
  const currentVersion = ref('')

  onMounted(() => {
    getAppVersion().then((v) => {
      currentVersion.value = v
    })
  })

  const busy = computed(() => stage.value === 'downloading' || stage.value === 'installing')
  const canLater = computed(() => !needForce.value)

  useEscapeOverlay(() => {
    if (!busy.value && !needForce.value) {
      visible.value = false
    }
  }, visible)

  const showProgress = computed(() => stage.value === 'downloading' || stage.value === 'installing')
  const progressPercent = computed(() => Math.round((progress.value || 0) * 100))
  const progressStatus = computed(() => 'default' as const)

  const versionLineKey = computed(() =>
    stage.value === 'ready' ? 'update.versionCompareDownloaded' : 'update.versionCompare'
  )

  const progressText = computed(() => {
    if (stage.value === 'downloading') return t('update.downloading')
    if (stage.value === 'installing') return t('update.installing')
    return ''
  })

  const primaryLabel = computed(() => {
    if (stage.value === 'error') return t('update.retry')
    return t('update.now')
  })

  const onLater = () => {
    visible.value = false
  }

  const onCancel = () => {
    appUpdateStore.cancelDownload().catch(() => undefined)
  }

  const onPrimary = () => {
    if (busy.value) return
    appUpdateStore.updateNow().catch(() => {
      window.$message?.error(t('update.installFailed'))
    })
  }

  watch(visible, (show) => {
    if (show && stage.value === 'error') {
      appUpdateStore.$patch((state) => {
        state.stage = 'idle'
        state.progress = 0
        state.errorMsg = ''
      })
    }
  })
</script>

<style scoped lang="scss">
  .update-modal {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 440px;
    max-width: 90vw;
    background: var(--bg-primary-color);
    border-radius: 12px;
    overflow: hidden;

    &__decor {
      position: absolute;
      top: -20px;
      right: -20px;
      width: 120px;
      height: 120px;
      pointer-events: none;
      z-index: 0;
    }

    &__decor-circle {
      position: absolute;
      border-radius: 50%;

      &--1 {
        width: 80px;
        height: 80px;
        top: 0;
        right: 20px;
        background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.15), rgba(var(--primary-rgb), 0.05));
      }

      &--2 {
        width: 60px;
        height: 60px;
        top: 30px;
        right: 0;
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(168, 85, 247, 0.06));
      }
    }

    &__header {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      padding: 28px 28px 0;
    }

    &__title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__versions {
      margin-top: 6px;
      font-size: 13px;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    &__versions-line {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }

    &__arrow {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--text-muted-color);
      transform: rotate(180deg);
    }

    &__latest {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__desc {
      position: relative;
      z-index: 1;
      padding: 16px 28px;
      font-size: 13px;
      color: var(--text-muted-color);
      line-height: 1.7;
      white-space: pre-wrap;
    }

    &__progress {
      position: relative;
      z-index: 1;
      padding: 0 28px 4px;

      :deep(.n-progress-icon),
      :deep(.n-progress .n-progress-custom-content),
      :deep(.n-progress-content) {
        color: var(--text-muted-color);
      }

      :deep(.n-progress.n-progress--line .n-progress-icon) {
        color: var(--text-muted-color);
      }
    }

    &__progress-text {
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted-color);
      line-height: 1.5;
    }

    &__error {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 28px 4px;
      font-size: 13px;
      color: var(--red);
      line-height: 1.5;
    }

    &__error-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    &__footer {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px 28px 24px;
    }
  }
</style>
