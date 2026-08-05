<template>
  <n-popover trigger="click" placement="top-start" :show-arrow="false" class="work-policy-popover">
    <template #trigger>
      <button type="button" class="work-policy" :disabled="disabled">
        <span>{{ currentLabel }}</span>
        <svg class="work-policy__arrow"><use href="#left-arrow" /></svg>
      </button>
    </template>

    <div class="work-policy-panel">
      <section>
        <strong>{{ t('ai.work.policy.workMode') }}</strong>
        <button
          v-for="option in workOptions"
          :key="option.value"
          type="button"
          :class="{ active: option.value === workMode }"
          @click="emit('update:work-mode', option.value)">
          <span>{{ option.label }}</span>
          <small>{{ option.description }}</small>
        </button>
      </section>
      <section>
        <strong>{{ t('ai.work.policy.approvalMode') }}</strong>
        <button
          v-for="option in approvalOptions"
          :key="option.value"
          type="button"
          :class="{ active: option.value === approvalMode, danger: option.value === 'yolo' }"
          @click="emit('update:approval-mode', option.value)">
          <span>{{ option.label }}</span>
          <small>{{ option.description }}</small>
        </button>
      </section>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
  import type { WorkApprovalMode, WorkMode } from '@/types/cmd/work'
  import { useI18n } from 'vue-i18n'

  const props = withDefaults(
    defineProps<{ workMode: WorkMode; approvalMode: WorkApprovalMode; disabled?: boolean }>(),
    {
      disabled: false
    }
  )
  const emit = defineEmits<{
    'update:work-mode': [value: WorkMode]
    'update:approval-mode': [value: WorkApprovalMode]
  }>()
  const { t } = useI18n()

  const workOptions = computed(() =>
    (['economy', 'balanced', 'delivery'] as WorkMode[]).map((value) => ({
      value,
      label: t(`ai.work.policy.workModes.${value}.label`),
      description: t(`ai.work.policy.workModes.${value}.description`)
    }))
  )
  const approvalOptions = computed(() =>
    (['ask', 'auto', 'yolo'] as WorkApprovalMode[]).map((value) => ({
      value,
      label: t(`ai.work.policy.approvalModes.${value}.label`),
      description: t(`ai.work.policy.approvalModes.${value}.description`)
    }))
  )
  const currentLabel = computed(
    () =>
      `${t(`ai.work.policy.workModes.${props.workMode}.label`)} · ${t(
        `ai.work.policy.approvalModes.${props.approvalMode}.label`
      )}`
  )
</script>

<style scoped lang="scss">
  .work-policy {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    height: 26px;
    padding: 0 4px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--text-secondary-color);
    font-size: 9px;
    cursor: pointer;
    &:hover {
      border-color: var(--border-color);
      background: var(--bg-muted-color);
      color: var(--text-color);
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    svg {
      width: 12px;
      height: 12px;
      flex: none;
    }
    &__arrow {
      transform: rotate(-90deg);
    }
  }

  :global(.work-policy-popover) {
    padding: 7px !important;
    background: var(--bg-muted-color) !important;
    border: 1px solid var(--border-color) !important;
  }
  .work-policy-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: min(520px, calc(100vw - 46px));
    section {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    section > strong {
      padding: 4px 7px;
      color: var(--text-secondary-color);
      font-size: 10px;
      font-weight: 500;
    }
    button {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 7px;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--text-color);
      text-align: left;
      cursor: pointer;
      &:hover {
        background: var(--icon-hover-color);
      }
      &.active {
        border-color: color-mix(in srgb, var(--primary-color) 38%, var(--border-color));
        background: color-mix(in srgb, var(--primary-color) 9%, var(--bg-primary-color));
      }
      &.danger.active {
        border-color: color-mix(in srgb, var(--yellow) 45%, var(--border-color));
      }
    }
    button span {
      font-size: 10px;
      font-weight: 500;
    }
    button small {
      margin-top: 3px;
      color: var(--text-secondary-color);
      font-size: 9px;
      line-height: 1.4;
    }
    @media (max-width: 560px) {
      grid-template-columns: 1fr;
    }
  }
</style>
