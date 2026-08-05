<template>
  <div class="work-settings">
    <header class="work-settings__header">
      <div>
        <h2>{{ t('settings.work.title') }}</h2>
        <p>{{ t('settings.work.description') }}</p>
      </div>
      <n-tag size="small" round :type="runtime?.installed ? 'default' : 'warning'">
        {{ runtime?.installed ? t('settings.work.runtime.ready') : t('settings.work.runtime.missing') }}
      </n-tag>
    </header>

    <n-tabs v-model:value="activeTab" type="line" animated>
      <n-tab-pane name="runtime" :tab="t('settings.work.tabs.runtime')">
        <SettingCard>
          <SettingRow :label="runtime?.name || 'Reasonix'" :desc="runtimeDescription">
            <n-button v-if="!runtime?.installed" type="primary" size="small" :loading="installing" @click="onInstall">
              {{ t('settings.work.runtime.install') }}
            </n-button>
            <n-button v-else size="small" :loading="loading" @click="onRefresh">
              {{ t('settings.work.runtime.detect') }}
            </n-button>
          </SettingRow>
          <SettingRow
            :label="t('settings.work.runtime.protocol')"
            :desc="t('settings.work.runtime.protocolDesc')"
            :border="false">
            <code>{{ runtime?.protocol || 'ACP v1' }}</code>
          </SettingRow>
        </SettingCard>
        <div v-if="installing" class="work-settings__progress">
          <n-progress type="line" :percentage="Math.round(installProgress * 100)" :show-indicator="false" />
          <span>{{ installStageLabel }}</span>
        </div>
      </n-tab-pane>

      <n-tab-pane name="providers" :tab="t('settings.work.tabs.providers')">
        <div class="work-settings__section-head">
          <div>
            <strong>{{ t('settings.work.provider.title') }}</strong>
            <p>{{ t('settings.work.provider.description') }}</p>
          </div>
          <n-button size="small" type="primary" @click="openProviderEditor()">
            {{ t('settings.work.provider.add') }}
          </n-button>
        </div>
        <div v-if="store.providers.length" class="work-settings__provider-list">
          <SettingCard v-for="provider in store.providers" :key="provider.id">
            <SettingRow
              :label="provider.name"
              :desc="`${provider.baseUrl} · ${t('settings.work.provider.modelCount', { count: provider.models.length })}`"
              :border="false">
              <n-tag size="small" :type="provider.hasApiKey ? 'default' : 'warning'">
                {{ provider.hasApiKey ? t('settings.work.provider.keySaved') : t('settings.work.provider.keyMissing') }}
              </n-tag>
              <n-button class="work-settings__provider-action" text size="small" @click="openProviderEditor(provider)">
                {{ t('common.edit') }}
              </n-button>
              <n-popconfirm @positive-click="onDeleteProvider(provider.id)">
                <template #trigger>
                  <n-button
                    class="work-settings__provider-action work-settings__provider-action--delete"
                    text
                    size="small">
                    {{ t('settings.work.provider.delete') }}
                  </n-button>
                </template>
                {{ t('settings.work.provider.deleteConfirm', { name: provider.name }) }}
              </n-popconfirm>
            </SettingRow>
          </SettingCard>
        </div>
        <n-empty v-else :description="t('settings.work.provider.empty')" />
      </n-tab-pane>

      <n-tab-pane name="model" :tab="t('settings.work.tabs.model')">
        <SettingCard>
          <SettingRow :label="t('settings.work.model.provider')" :desc="t('settings.work.model.providerDesc')">
            <n-select
              class="work-settings__select"
              :value="store.activeProviderId"
              :options="providerOptions"
              @update:value="onProviderSelect" />
          </SettingRow>
          <SettingRow :label="t('settings.work.model.model')" :desc="t('settings.work.model.modelDesc')">
            <n-select
              class="work-settings__select"
              :value="store.activeModel"
              :options="modelOptions"
              @update:value="onModelSelect" />
          </SettingRow>
          <SettingRow :label="t('settings.work.model.workMode')" :desc="t('settings.work.model.workModeDesc')">
            <n-select
              class="work-settings__select"
              :value="store.workMode"
              :options="workModeOptions"
              @update:value="onWorkModeSelect" />
          </SettingRow>
          <SettingRow
            :label="t('settings.work.model.approval')"
            :desc="t('settings.work.model.approvalDesc')"
            :border="false">
            <n-select
              class="work-settings__select"
              :value="store.approvalMode"
              :options="approvalOptions"
              @update:value="onApprovalSelect" />
          </SettingRow>
        </SettingCard>
      </n-tab-pane>

      <n-tab-pane name="skills" :tab="t('settings.work.tabs.skills')">
        <SettingCard>
          <SettingRow
            v-for="(skill, index) in installedSkills"
            :key="skill.id"
            :label="skill.name"
            :desc="skill.description"
            :border="index < installedSkills.length - 1">
            <div class="work-settings__skill-actions">
              <n-switch size="small" :value="skill.enabled" @update:value="store.toggleSkill(skill.id, $event)" />
              <n-button size="small" quaternary @click="onUninstallSkill(skill)">
                {{ t('settings.work.skills.uninstall') }}
              </n-button>
            </div>
          </SettingRow>
          <div v-if="!installedSkills.length" class="work-settings__skill-empty">
            {{ t('ai.work.status.noInstalledSkills') }}
          </div>
        </SettingCard>
      </n-tab-pane>
    </n-tabs>

    <n-modal v-model:show="showProviderModal" :mask-closable="!savingProvider && !testingProvider">
      <n-card
        class="work-settings__modal"
        :style="{
          width: 'min(620px, calc(100vw - 48px))',
          backgroundColor: 'var(--bg-primary-color)',
          color: 'var(--text-color)'
        }"
        :bordered="true"
        closable
        role="dialog"
        :title="t('settings.work.provider.editorTitle')"
        @close="showProviderModal = false">
        <n-form label-placement="top">
          <div class="work-settings__preset-row">
            <n-button size="tiny" @click="applyPreset('deepseek')">DeepSeek</n-button>
            <n-button size="tiny" @click="applyPreset('openai')">OpenAI Compatible</n-button>
            <n-button size="tiny" @click="applyPreset('anthropic')">Anthropic</n-button>
          </div>
          <n-form-item :label="t('settings.work.provider.name')">
            <n-input v-model:value="providerForm.name" />
          </n-form-item>
          <div class="work-settings__form-grid">
            <n-form-item :label="t('settings.work.provider.id')">
              <n-input class="work-settings__provider-id" v-model:value="providerForm.id" :disabled="editingProvider" />
            </n-form-item>
            <n-form-item :label="t('settings.work.provider.kind')">
              <n-select v-model:value="providerForm.kind" :options="kindOptions" />
            </n-form-item>
          </div>
          <n-form-item :label="t('settings.work.provider.baseUrl')">
            <n-input v-model:value="providerForm.baseUrl" />
          </n-form-item>
          <n-form-item :label="t('settings.work.provider.apiKey')">
            <n-input
              v-model:value="providerForm.apiKey"
              type="password"
              show-password-on="click"
              :placeholder="apiKeyPlaceholder" />
          </n-form-item>
          <n-form-item :label="t('settings.work.provider.models')">
            <n-dynamic-tags v-model:value="providerForm.models" />
          </n-form-item>
          <n-form-item :label="t('settings.work.provider.defaultModel')">
            <n-select v-model:value="providerForm.defaultModel" :options="providerModelOptions" tag filterable />
          </n-form-item>
          <div v-if="providerTestMessage" class="work-settings__test-result" :class="{ success: providerTestSuccess }">
            <span>
              <i />
              {{ providerTestMessage }}
            </span>
          </div>
        </n-form>
        <template #footer>
          <div class="work-settings__modal-actions">
            <n-button @click="showProviderModal = false">{{ t('common.cancel') }}</n-button>
            <n-button :loading="testingProvider" :disabled="savingProvider" @click="onTestProvider">
              {{ t('settings.work.provider.test') }}
            </n-button>
            <n-button type="primary" :loading="savingProvider" @click="onSaveProvider">
              {{ t('common.save') }}
            </n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
  import type { UnlistenFn } from '@tauri-apps/api/event'
  import SettingCard from '@/components/Set/SettingCard.vue'
  import SettingRow from '@/components/Set/SettingRow.vue'
  import * as workService from '@/services/workService'
  import { parseWorkError } from '@/services/workError'
  import { useWorkAssistantStore } from '@/stores/app/workAssistant'
  import type { WorkApprovalMode, WorkMode, WorkProvider, WorkProviderInput } from '@/types/cmd/work'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const dialog = useDialog()
  const store = useWorkAssistantStore()
  const activeTab = ref('runtime')
  const installing = ref(false)
  const loading = ref(false)
  const installProgress = ref(0)
  const installStage = ref('checking')
  const showProviderModal = ref(false)
  const savingProvider = ref(false)
  const testingProvider = ref(false)
  const providerTestSuccess = ref(false)
  const providerTestMessage = ref('')
  const editingProvider = ref(false)
  let unlisten: UnlistenFn | undefined

  const emptyProvider = (): WorkProviderInput => ({
    id: '',
    name: '',
    kind: 'openai',
    baseUrl: '',
    models: [],
    defaultModel: '',
    apiKey: '',
    enabled: true
  })
  const providerForm = reactive<WorkProviderInput>(emptyProvider())
  const runtime = computed(() => store.runtimes.find((item) => item.id === store.activeRuntimeId))
  const runtimeDescription = computed(() =>
    runtime.value?.installed
      ? `${runtime.value.executablePath || ''} · ${runtime.value.version || ''}`
      : t('settings.work.runtime.missingDesc')
  )
  const installStageLabel = computed(() => t(`settings.work.runtime.stage.${installStage.value}`))
  const providerOptions = computed(() =>
    store.providers.filter((item) => item.enabled).map((item) => ({ label: item.name, value: item.id }))
  )
  const activeProvider = computed(() => store.providers.find((item) => item.id === store.activeProviderId))
  const modelOptions = computed(() =>
    (activeProvider.value?.models || []).map((model) => ({ label: model, value: model }))
  )
  const providerModelOptions = computed(() => providerForm.models.map((model) => ({ label: model, value: model })))
  const apiKeyPlaceholder = computed(() => (editingProvider.value ? t('settings.work.provider.keepKey') : 'sk-...'))
  const kindOptions = [
    { label: 'OpenAI Compatible', value: 'openai' },
    { label: 'Anthropic', value: 'anthropic' }
  ]
  const workModeOptions = computed(() =>
    ['economy', 'balanced', 'delivery'].map((value) => ({ label: t(`settings.work.model.workModes.${value}`), value }))
  )
  const approvalOptions = computed(() =>
    ['ask', 'auto', 'yolo'].map((value) => ({ label: t(`settings.work.model.approvalModes.${value}`), value }))
  )
  const installedSkills = computed(() => store.skills.filter((skill) => skill.installed))

  const onRefresh = async () => {
    loading.value = true
    try {
      await store.refreshStatus()
      const current = store.runtimes.find((item) => item.id === store.activeRuntimeId)
      if (!current?.installed) return
      try {
        const update = await workService.checkRuntimeUpdate()
        if (update.updateAvailable) {
          dialog.info({
            title: t('settings.work.runtime.updateTitle'),
            content: t('settings.work.runtime.updateConfirm', {
              current: update.currentVersion || '-',
              latest: update.latestVersion || '-'
            }),
            positiveText: t('settings.work.runtime.install'),
            negativeText: t('common.cancel'),
            onPositiveClick: () => {
              onInstall()
            }
          })
        } else {
          window.$message?.success(t('settings.work.runtime.upToDate'))
        }
      } catch {
        // 本地检测已成功，远端版本检查失败不打断
      }
    } finally {
      loading.value = false
    }
  }
  const onInstall = async () => {
    installing.value = true
    installProgress.value = 0
    try {
      await workService.installRuntime()
      window.$message?.success(t('settings.work.runtime.installerOpened'))
    } catch (error) {
      showFriendlyError(error)
    } finally {
      installing.value = false
      await store.refreshStatus()
    }
  }
  const openProviderEditor = (provider?: WorkProvider) => {
    editingProvider.value = Boolean(provider)
    Object.assign(providerForm, provider ? { ...provider, apiKey: '' } : emptyProvider())
    providerTestMessage.value = ''
    providerTestSuccess.value = false
    showProviderModal.value = true
  }
  const applyPreset = (preset: 'deepseek' | 'openai' | 'anthropic') => {
    const presets = {
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        kind: 'openai' as const,
        baseUrl: 'https://api.deepseek.com',
        models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
        defaultModel: 'deepseek-v4-flash'
      },
      openai: {
        id: 'openai',
        name: 'OpenAI Compatible',
        kind: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-5.4'],
        defaultModel: 'gpt-5.4'
      },
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        kind: 'anthropic' as const,
        baseUrl: 'https://api.anthropic.com',
        models: ['claude-sonnet-4-6'],
        defaultModel: 'claude-sonnet-4-6'
      }
    }
    Object.assign(providerForm, presets[preset])
  }
  const onSaveProvider = async () => {
    if (!providerForm.id || !providerForm.name || !providerForm.baseUrl || !providerForm.defaultModel) {
      window.$message?.warning(t('settings.work.provider.required'))
      return
    }
    savingProvider.value = true
    try {
      await store.saveProvider({ ...providerForm, models: [...providerForm.models] })
      showProviderModal.value = false
      window.$message?.success(t('settings.work.provider.saved'))
    } catch (error) {
      showFriendlyError(error)
    } finally {
      savingProvider.value = false
    }
  }
  const testCurrentProvider = async () => {
    if (!providerForm.id || !providerForm.baseUrl || !providerForm.defaultModel) {
      window.$message?.warning(t('settings.work.provider.required'))
      return false
    }
    testingProvider.value = true
    providerTestMessage.value = ''
    try {
      const result = await store.testProvider({ ...providerForm, models: [...providerForm.models] })
      providerTestSuccess.value = result.ok
      providerTestMessage.value = t('settings.work.provider.testSuccess', { latency: result.latencyMs })
      if (result.models.length && !providerForm.models.length) providerForm.models = result.models
      return result.ok
    } catch (error) {
      providerTestSuccess.value = false
      providerTestMessage.value = t(parseWorkError(error).key)
      return false
    } finally {
      testingProvider.value = false
    }
  }
  const onTestProvider = () => testCurrentProvider()
  const showFriendlyError = (error: unknown) => window.$message?.error(t(parseWorkError(error).key))
  const onDeleteProvider = async (id: string) => {
    await store.removeProvider(id)
    window.$message?.success(t('settings.work.provider.deleted'))
  }
  const onProviderSelect = async (value: string) => {
    const provider = store.providers.find((item) => item.id === value)
    await store.savePreferences({ activeProviderId: value, activeModel: provider?.defaultModel })
  }
  const onModelSelect = (value: string) => store.savePreferences({ activeModel: value })
  const onWorkModeSelect = (value: WorkMode) => store.savePreferences({ workMode: value })
  const onApprovalSelect = (value: WorkApprovalMode) => store.savePreferences({ approvalMode: value })
  const onUninstallSkill = (skill: { id: string; name: string }) => {
    dialog.warning({
      title: t('settings.work.skills.uninstall'),
      content: t('ai.work.skills.uninstallConfirm', { name: skill.name }),
      positiveText: t('settings.work.skills.uninstall'),
      negativeText: t('common.cancel'),
      onPositiveClick: () =>
        store
          .uninstallSkill(skill.id)
          .then(() => window.$message?.success(t('settings.work.skills.uninstalled')))
          .catch(showFriendlyError)
    })
  }

  onMounted(async () => {
    unlisten = await workService.onWorkEvent((event) => {
      if (event.kind !== 'install_progress') return
      installProgress.value = Number(event.payload.progress || 0)
      installStage.value = String(event.payload.stage || 'checking')
    })
    store.initialize().catch(showFriendlyError)
  })
  onBeforeUnmount(() => unlisten?.())
</script>

<style scoped lang="scss">
  .work-settings {
    padding: 0 4px 18px;
    &__header,
    &__section-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    h2 {
      margin: 0;
      color: var(--text-color);
      font-size: 17px;
    }
    p {
      margin: 5px 0 0;
      color: var(--text-secondary-color);
      font-size: 12px;
      line-height: 1.5;
    }
    code {
      color: var(--text-secondary-color);
      font-size: 12px;
      word-break: break-all;
    }
    &__progress {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      color: var(--text-secondary-color);
      font-size: 12px;
    }
    &__progress :deep(.n-progress) {
      flex: 1;
    }
    &__provider-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    &__provider-action {
      --n-text-color: var(--primary-color) !important;
      --n-text-color-hover: var(--primary-soft-color) !important;
      --n-text-color-pressed: var(--primary-strong-color) !important;
      --n-text-color-focus: var(--primary-color) !important;
      &--delete {
        --n-text-color: var(--red) !important;
        --n-text-color-hover: color-mix(in srgb, var(--red) 82%, var(--text-color)) !important;
        --n-text-color-pressed: var(--red) !important;
        --n-text-color-focus: var(--red) !important;
      }
    }
    &__select {
      width: 220px;
    }
    &__modal {
      width: min(620px, 90vw);
      :deep(.n-form-item-label) {
        color: var(--text-color);
      }
      :deep(.n-input.n-input--disabled) {
        --n-color-disabled: var(--input-soft-bg) !important;
        --n-text-color-disabled: var(--text-secondary-color) !important;
        --n-border-disabled: 1px solid var(--border-color) !important;
      }
    }
    &__preset-row {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }
    &__form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    &__modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    &__test-result {
      display: flex;
      align-items: center;
      padding: 9px 11px;
      border: 1px solid color-mix(in srgb, var(--red) 30%, var(--border-color));
      border-radius: 7px;
      background: color-mix(in srgb, var(--red) 7%, var(--bg-secondary-color));
      color: var(--text-secondary-color);
      font-size: 11px;
    }
    &__test-result span {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    &__test-result i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--red);
    }
    &__test-result.success {
      border-color: color-mix(in srgb, var(--primary-color) 42%, var(--border-color));
      background: color-mix(in srgb, var(--primary-color) 7%, var(--bg-secondary-color));
    }
    &__test-result.success i {
      background: var(--primary-color);
    }
    &__skill-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    &__skill-empty {
      padding: 28px 16px;
      color: var(--text-muted-color);
      font-size: 12px;
      text-align: center;
    }
    @media (max-width: 620px) {
      &__form-grid {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
  }
</style>
