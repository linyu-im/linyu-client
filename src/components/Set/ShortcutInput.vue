<template>
  <div class="shortcut-input">
    <n-input
      class="shortcut-input__field"
      :value="modelValue"
      size="small"
      readonly
      :placeholder="placeholder"
      @click="onCapture" />
    <button
      v-if="modelValue"
      type="button"
      class="shortcut-input__clear"
      :aria-label="t('settings.shortcuts.clear')"
      @click="onClear">
      <svg class="size-12px" aria-hidden="true">
        <use href="#close"></use>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'

  const props = withDefaults(
    defineProps<{
      modelValue?: string
      placeholder?: string
    }>(),
    {
      modelValue: '',
      placeholder: ''
    }
  )

  const emit = defineEmits<{
    'update:modelValue': [value: string]
  }>()

  const { t } = useI18n()

  const onClear = () => {
    emit('update:modelValue', '')
  }

  const onCapture = () => {
    window.$message?.info(t('settings.todo'))
  }
</script>

<style scoped lang="scss">
  .shortcut-input {
    display: flex;
    align-items: center;
    gap: 6px;

    &__field {
      width: 140px;
      cursor: pointer;
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
      color: var(--text-secondary-color);
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
