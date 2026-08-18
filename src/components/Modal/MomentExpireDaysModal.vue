<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="true"
    :auto-focus="false"
    transform-origin="center"
    @after-leave="resetState">
    <div class="moment-expire-modal">
      <div class="moment-expire-modal__header">
        <h2 class="moment-expire-modal__title">{{ t('moment.expireDays.title') }}</h2>
        <button
          type="button"
          class="moment-expire-modal__close"
          :aria-label="t('moment.expireDays.cancel')"
          @click="onCancel">
          <svg class="size-14px" aria-hidden="true">
            <use href="#close" />
          </svg>
        </button>
      </div>

      <div class="moment-expire-modal__body">
        <p class="moment-expire-modal__hint">{{ t('moment.expireDays.hint') }}</p>
        <n-radio-group v-model:value="selectedDays" class="moment-expire-modal__group" name="moment-expire-days">
          <div
            v-for="option in options"
            :key="option.value"
            class="moment-expire-modal__option"
            @click="selectedDays = option.value">
            <n-radio :value="option.value" :label="option.label" />
          </div>
        </n-radio-group>
      </div>

      <div class="moment-expire-modal__footer">
        <n-button class="moment-expire-modal__btn" @click="onCancel">
          {{ t('moment.expireDays.cancel') }}
        </n-button>
        <n-button
          class="moment-expire-modal__btn"
          type="primary"
          :loading="submitting"
          :disabled="loading"
          @click="onSubmit">
          {{ t('moment.expireDays.confirm') }}
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { momentApi } from '@/api'
  import { useEscapeOverlay } from '@/composables/useEscapeOverlayStack'
  import { useI18n } from 'vue-i18n'

  /** 0=永久(全部) -1=不可见；与后端 expireDays 约定一致 */
  const EXPIRE_DAY_OPTIONS = [180, 30, 3, 0, -1] as const

  const visible = defineModel<boolean>('show', { default: false })

  const props = defineProps<{
    userId: string
  }>()

  const { t } = useI18n()

  const loading = ref(false)
  const submitting = ref(false)
  const selectedDays = ref<number>(0)

  const options = computed(() =>
    EXPIRE_DAY_OPTIONS.map((value) => ({
      value,
      label: t(`moment.expireDays.options.${value === -1 ? 'invisible' : value}`)
    }))
  )

  useEscapeOverlay(() => {
    visible.value = false
  }, visible)

  /** 精确匹配选项；否则选最接近的一档（托底） */
  const normalizeExpireDays = (days: number) => {
    const value = Number(days)
    if (!Number.isFinite(value)) return 0

    let best: (typeof EXPIRE_DAY_OPTIONS)[number] = EXPIRE_DAY_OPTIONS[0]
    let bestDiff = Math.abs(value - best)

    for (const option of EXPIRE_DAY_OPTIONS) {
      const diff = Math.abs(value - option)
      if (diff < bestDiff) {
        best = option
        bestDiff = diff
      }
    }

    return best
  }

  const readExpireDays = (data: { expireDays?: number; ExpireDays?: number }) => {
    const raw = data.expireDays ?? data.ExpireDays
    return normalizeExpireDays(raw ?? 0)
  }

  const resetState = () => {
    loading.value = false
    submitting.value = false
    selectedDays.value = 0
  }

  const loadCurrent = () => {
    if (!props.userId) return

    loading.value = true
    momentApi
      .getSetting({ userId: props.userId })
      .then((res) => {
        if (res.code === 0 && res.data) {
          selectedDays.value = readExpireDays(res.data)
          return
        }
        window.$message.error(res.msg)
      })
      .catch(() => {
        window.$message.error(t('moment.expireDays.loadFailed'))
      })
      .finally(() => {
        loading.value = false
      })
  }

  const onCancel = () => {
    visible.value = false
  }

  const onSubmit = () => {
    if (submitting.value || loading.value) return

    submitting.value = true
    momentApi
      .setExpireDays({ expireDays: selectedDays.value })
      .then((res) => {
        if (res.code === 0) {
          window.$message.success(t('moment.expireDays.success'))
          visible.value = false
          return
        }
        window.$message.error(res.msg)
      })
      .catch(() => {
        window.$message.error(t('moment.expireDays.failed'))
      })
      .finally(() => {
        submitting.value = false
      })
  }

  watch(visible, (show) => {
    if (show) {
      loadCurrent()
    }
  })
</script>

<style scoped lang="scss">
  .moment-expire-modal {
    width: 420px;
    max-width: calc(100vw - 48px);
    border-radius: 12px;
    background: var(--bg-primary-color);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
    overflow: hidden;

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px 12px;
    }

    &__title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      line-height: 1.4;
    }

    &__close {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-secondary-color);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      &:hover {
        background: var(--button-soft-bg);
        color: var(--text-color);
      }
    }

    &__body {
      padding: 4px 20px 8px;
    }

    &__hint {
      margin: 0 0 12px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary-color);
    }

    &__group {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 4px;
    }

    &__option {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: var(--button-soft-bg);
      }

      :deep(.n-radio) {
        width: 100%;
      }

      :deep(.n-radio__label) {
        color: var(--text-color);
        font-size: 14px;
      }
    }

    &__footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 20px 18px;
    }

    &__btn {
      min-width: 88px;
    }
  }
</style>
