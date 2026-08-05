<template>
  <footer class="work-status">
    <div class="work-status__group">
      <button type="button" class="work-status__item" @click="emit('open-settings')">
        <span class="work-status__agent-mark" :class="{ 'work-status__agent-mark--ready': status?.runtime.installed }">
          ✦
        </span>
        <span>{{ status?.runtime.name || 'Reasonix' }}</span>
        <span class="work-status__muted">{{ status?.runtime.version || t('ai.work.status.notInstalled') }}</span>
      </button>
      <n-popover
        v-model:show="showModelPicker"
        trigger="click"
        placement="top-start"
        :show-arrow="false"
        class="work-status-model-popover">
        <template #trigger>
          <button type="button" class="work-status__item">
            <svg><use href="#ai" /></svg>
            <span>{{ providerModel }}</span>
          </button>
        </template>
        <div class="work-status-model-panel">
          <strong>{{ t('ai.work.status.selectModel') }}</strong>
          <button
            v-for="model in modelOptions"
            :key="model"
            type="button"
            :class="{ active: model === currentModel }"
            :disabled="savingModel"
            @click="selectModel(model)">
            {{ model }}
          </button>
          <p v-if="!modelOptions.length">{{ t('ai.work.status.noModelOptions') }}</p>
        </div>
      </n-popover>
    </div>

    <div class="work-status__group work-status__group--right">
      <n-popover
        v-model:show="showSkillPicker"
        trigger="click"
        placement="top"
        :show-arrow="false"
        class="work-status-model-popover">
        <template #trigger>
          <button type="button" class="work-status__item">
            <svg><use href="#star" /></svg>
            <span>{{ t('ai.work.status.skills', { count: enabledSkillCount }) }}</span>
          </button>
        </template>
        <div class="work-status-skill-panel">
          <strong>{{ t('ai.work.status.installedSkills') }}</strong>
          <div v-if="installedSkills.length" class="work-status-skill-panel__list">
            <div v-for="skill in installedSkills" :key="skill.id" class="work-status-skill-panel__row">
              <span :title="skill.name">{{ skill.name }}</span>
              <n-switch
                size="small"
                :value="skill.enabled"
                :loading="togglingSkillId === skill.id"
                @update:value="onToggleSkill(skill.id, $event)" />
            </div>
          </div>
          <p v-else>{{ t('ai.work.status.noInstalledSkills') }}</p>
        </div>
      </n-popover>
      <span class="work-status__item">
        {{ t(`ai.work.approval.${status?.approvalMode || 'ask'}`) }}
      </span>
      <span class="work-status__item work-status__connection" :class="{ 'work-status__connection--ready': ready }">
        <span>{{ ready ? t('ai.work.status.ready') : t('ai.work.status.setup') }}</span>
        <i />
      </span>
    </div>
  </footer>
</template>

<script setup lang="ts">
  import { parseWorkError } from '@/services/workError'
  import { useWorkAssistantStore } from '@/stores/app/workAssistant'
  import type { WorkStatus } from '@/types/cmd/work'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{ status: WorkStatus | null }>()
  const emit = defineEmits<{ 'open-settings': [] }>()
  const { t } = useI18n()
  const store = useWorkAssistantStore()
  const showModelPicker = ref(false)
  const showSkillPicker = ref(false)
  const savingModel = ref(false)
  const togglingSkillId = ref('')

  const activeProvider = computed(
    () => store.providers.find((item) => item.id === store.activeProviderId) || props.status?.provider
  )
  const modelOptions = computed(() => activeProvider.value?.models || [])
  const currentModel = computed(
    () => store.activeModel || props.status?.model || activeProvider.value?.defaultModel || ''
  )
  const ready = computed(() =>
    Boolean(
      props.status?.runtime.installed &&
      props.status?.provider?.hasApiKey &&
      (props.status?.model || props.status?.provider?.defaultModel)
    )
  )
  const providerModel = computed(() => {
    if (!activeProvider.value) return t('ai.work.status.noModel')
    return `${activeProvider.value.name} · ${currentModel.value || t('ai.work.status.noModel')}`
  })
  const installedSkills = computed(() => store.skills.filter((skill) => skill.installed))
  const enabledSkillCount = computed(() => installedSkills.value.filter((skill) => skill.enabled).length)

  const selectModel = (model: string) => {
    if (!model || model === currentModel.value || savingModel.value) return
    savingModel.value = true
    store
      .savePreferences({ activeModel: model })
      .then(() => store.refreshStatus())
      .then(() => {
        showModelPicker.value = false
      })
      .catch((error) => {
        window.$message?.error(t(parseWorkError(error).key))
      })
      .finally(() => {
        savingModel.value = false
      })
  }

  const onToggleSkill = (id: string, enabled: boolean) => {
    if (togglingSkillId.value) return
    togglingSkillId.value = id
    store
      .toggleSkill(id, enabled)
      .catch((error) => {
        window.$message?.error(t(parseWorkError(error).key))
      })
      .finally(() => {
        togglingSkillId.value = ''
      })
  }
</script>

<style scoped lang="scss">
  .work-status {
    flex: 0 0 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: 0 12px;
    border-top: 1px solid color-mix(in srgb, var(--border-color) 75%, transparent);
    background: color-mix(in srgb, var(--bg-secondary-color) 92%, var(--card-bg-color));
    color: var(--text-secondary-color);
    font-size: 11px;
    user-select: none;
    &__group {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 6px;
    }
    &__group--right {
      justify-content: flex-end;
    }
    &__item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      padding: 4px 7px;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    button#{&}__item {
      cursor: pointer;
      &:hover {
        color: var(--text-color);
        background: var(--bg-muted-color);
      }
    }
    svg {
      width: 13px;
      height: 13px;
      flex: none;
    }
    &__agent-mark {
      color: var(--text-muted-color);
      font-size: 16px;
      line-height: 1;
      &--ready {
        color: var(--primary-color);
      }
    }
    &__muted {
      color: var(--text-muted-color);
    }
    &__connection {
      color: var(--text-muted-color);
      &--ready {
        color: var(--text-secondary-color);
      }
    }
    &__connection i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--text-muted-color);
    }
    &__connection--ready i {
      background: var(--primary-color);
      box-shadow: 0 0 8px color-mix(in srgb, var(--primary-color) 65%, transparent);
    }
    @media (max-width: 900px) {
      &__muted,
      &__group--right &__item:nth-child(2) {
        display: none;
      }
    }
  }

  :global(.work-status-model-popover) {
    padding: 7px !important;
    background: var(--bg-muted-color) !important;
    border: 1px solid var(--border-color) !important;
  }
  .work-status-model-panel {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 180px;
    max-width: min(320px, calc(100vw - 46px));
    max-height: 260px;
    overflow: auto;
    > strong {
      padding: 4px 7px;
      color: var(--text-secondary-color);
      font-size: 10px;
      font-weight: 500;
    }
    button {
      display: block;
      width: 100%;
      padding: 7px;
      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--text-color);
      font-size: 11px;
      text-align: left;
      cursor: pointer;
      &:hover:not(:disabled) {
        background: var(--icon-hover-color);
      }
      &.active {
        border-color: color-mix(in srgb, var(--primary-color) 38%, var(--border-color));
        background: color-mix(in srgb, var(--primary-color) 9%, var(--bg-primary-color));
        color: var(--primary-color);
      }
      &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
    }
    p {
      margin: 0;
      padding: 8px 7px;
      color: var(--text-muted-color);
      font-size: 11px;
      line-height: 1.4;
    }
  }
  .work-status-skill-panel {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 168px;
    max-height: 280px;
    > strong {
      padding: 4px 7px;
      color: var(--text-secondary-color);
      font-size: 10px;
      font-weight: 500;
      text-align: left;
    }
    &__list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: auto;
    }
    &__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-width: 0;
      padding: 6px 7px;
      border-radius: 7px;
      span {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        color: var(--text-color);
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    p {
      margin: 0;
      padding: 12px 8px;
      color: var(--text-muted-color);
      font-size: 11px;
      line-height: 1.4;
      text-align: center;
    }
  }
</style>
