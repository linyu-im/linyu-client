<template>
  <div class="shortcut-input">
    <div class="shortcut-input__body">
      <n-tooltip v-if="conflict" placement="top" :show-arrow="false">
        <template #trigger>
          <span class="shortcut-input__conflict" :aria-label="t('settings.shortcuts.conflictHint')">
            <svg class="shortcut-input__conflict-icon" aria-hidden="true">
              <use href="#warning"></use>
            </svg>
          </span>
        </template>
        {{ t('settings.shortcuts.conflictHint') }}
      </n-tooltip>
      <n-input
        class="shortcut-input__field"
        :value="displayValue"
        size="small"
        readonly
        :placeholder="fieldPlaceholder"
        :status="error ? 'error' : undefined"
        @click="onCapture"
        @blur="onBlur" />
      <button
        v-if="modelValue"
        type="button"
        class="shortcut-input__clear"
        :aria-label="t('settings.shortcuts.clear')"
        @mousedown.prevent
        @click="onClear">
        <svg class="size-12px" aria-hidden="true">
          <use href="#close"></use>
        </svg>
      </button>
    </div>
    <div v-if="error" class="shortcut-input__error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { formatShortcutFromEvent } from '@/utils/desktop/shortcuts'

  const props = withDefaults(
    defineProps<{
      modelValue?: string
      placeholder?: string
      error?: string
      conflict?: boolean
    }>(),
    {
      modelValue: '',
      placeholder: '',
      error: '',
      conflict: false
    }
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const { t } = useI18n()
  const capturing = ref(false)

  const fieldPlaceholder = computed(() => {
    if (capturing.value) return t('settings.shortcuts.pressKeys')
    return props.placeholder || t('settings.shortcuts.clickToSet')
  })

  const displayValue = computed(() => (capturing.value ? '' : props.modelValue))

  const stopCapture = () => {
    if (!capturing.value) return
    capturing.value = false
    window.removeEventListener('keydown', onKeyDown, true)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!capturing.value) return
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      stopCapture()
      return
    }

    const shortcut = formatShortcutFromEvent(event)
    if (!shortcut) return

    stopCapture()
    emit('update:modelValue', shortcut)
  }

  const onCapture = () => {
    if (capturing.value) return
    capturing.value = true
    window.addEventListener('keydown', onKeyDown, true)
  }

  const onBlur = () => {
    // 延迟，避免点清除时立刻结束录入
    setTimeout(() => {
      stopCapture()
    }, 120)
  }

  const onClear = () => {
    stopCapture()
    emit('update:modelValue', '')
  }

  onUnmounted(() => {
    stopCapture()
  })
</script>

<style scoped lang="scss">
  .shortcut-input {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;

    &__body {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    &__field {
      width: 140px;
      cursor: pointer;
    }

    &__conflict {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: var(--yellow);
      cursor: default;
      flex-shrink: 0;
    }

    &__conflict-icon {
      width: 16px;
      height: 16px;
      display: block;
    }

    &__error {
      max-width: 220px;
      font-size: 12px;
      line-height: 1.4;
      color: var(--red);
      text-align: right;
    }

    &__clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
    }
  }
</style>
