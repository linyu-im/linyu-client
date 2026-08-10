<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    :close-on-esc="false"
    transform-origin="center"
    :auto-focus="false">
    <div class="force-update-modal">
      <div class="force-update-modal__header">
        <div class="force-update-modal__title">{{ t('update.forceTitle') }}</div>
        <div class="force-update-modal__subtitle">
          {{ t('update.latestVersionLabel', { version: version || '-' }) }}
        </div>
      </div>

      <div v-if="description" class="force-update-modal__desc">{{ description }}</div>

      <div v-if="stage === 'error'" class="force-update-modal__error">
        <svg class="force-update-modal__error-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M15 9l-6 6M9 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>{{ t('update.downloadFailed') }}</span>
      </div>
      <div v-else-if="showProgress" class="force-update-modal__progress">
        <n-progress
          type="line"
          :percentage="progressPercent"
          :show-indicator="true"
          :height="8"
          :border-radius="4"
          :fill-border-radius="4"
          :status="progressStatus" />
        <div class="force-update-modal__progress-text">{{ progressText }}</div>
      </div>

      <div v-else class="force-update-modal__tip">{{ t('update.forceDesc') }}</div>

      <n-button v-if="stage === 'downloading'" class="force-update-modal__btn" block @click="onCancel">
        {{ t('update.cancel') }}
      </n-button>
      <n-button
        v-else
        class="force-update-modal__btn"
        type="primary"
        block
        :loading="stage === 'installing'"
        :disabled="stage === 'installing'"
        @click="onUpdate">
        {{ primaryLabel }}
      </n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import { useAppUpdateStore } from '@/stores/app/appUpdate'
  import { useI18n } from 'vue-i18n'

  const visible = defineModel<boolean>('show', { default: false })

  const { t } = useI18n()
  const appUpdateStore = useAppUpdateStore()
  const { checkResult, stage, progress } = storeToRefs(appUpdateStore)

  const version = computed(() => checkResult.value?.latestVersion || '')
  const description = computed(() => checkResult.value?.updateDesc || '')

  const showProgress = computed(() => stage.value === 'downloading' || stage.value === 'installing')
  const progressPercent = computed(() => Math.round((progress.value || 0) * 100))
  const progressStatus = computed(() => 'default' as const)

  const progressText = computed(() => {
    if (stage.value === 'downloading') return t('update.downloading')
    if (stage.value === 'installing') return t('update.installing')
    return ''
  })

  const primaryLabel = computed(() => {
    if (stage.value === 'error') return t('update.retry')
    if (stage.value === 'installing') return t('update.installing')
    return t('update.now')
  })

  const onCancel = () => {
    appUpdateStore.cancelDownload().catch(() => undefined)
  }

  const onUpdate = () => {
    appUpdateStore.updateNow().catch(() => {
      window.$message?.error(t('update.installFailed'))
    })
  }
</script>

<style scoped lang="scss">
  .force-update-modal {
    display: flex;
    flex-direction: column;
    width: 360px;
    max-width: 90vw;
    padding: 28px 24px 24px;
    box-sizing: border-box;
    background: var(--bg-primary-color);
    border-radius: 12px;

    &__header {
      margin-bottom: 16px;
      text-align: center;
    }

    &__title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__subtitle {
      margin-top: 6px;
      font-size: 13px;
      color: var(--text-secondary-color);
      line-height: 1.5;
    }

    &__desc {
      margin-bottom: 16px;
      padding: 12px 14px;
      font-size: 13px;
      color: var(--text-muted-color);
      line-height: 1.6;
      background: var(--bg-muted-color);
      border-radius: 8px;
      white-space: pre-wrap;
      max-height: 160px;
      overflow: auto;
      text-align: center;
    }

    &__progress {
      margin-bottom: 16px;

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
      text-align: center;
    }

    &__error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 13px;
      color: var(--red);
      line-height: 1.5;
    }

    &__error-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    &__tip {
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--text-secondary-color);
      line-height: 1.5;
      text-align: center;
    }

    &__btn {
      height: 40px;
      font-size: 14px;
    }
  }
</style>
