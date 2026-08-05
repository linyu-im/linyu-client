<template>
  <section v-if="steps.length || running || stalled" class="work-run" :class="{ 'work-run__stalled': stalled }">
    <button type="button" class="work-run__header" @click="expanded = !expanded">
      <span class="work-run__state">
        <i :class="{ running, stalled }" />
        <strong>{{ summary }}</strong>
      </span>
      <span>
        {{ elapsedLabel }}
        <svg :class="{ expanded }"><use href="#left-arrow" /></svg>
      </span>
    </button>

    <div v-if="expanded" class="work-run__body">
      <article v-for="step in steps" :key="step.id" class="work-run__step">
        <span class="work-run__step-icon" :class="step.status">
          <svg><use :href="stepIcon(step.kind)" /></svg>
        </span>
        <div>
          <strong>{{ step.title }}</strong>
          <small v-if="step.detail">{{ step.detail }}</small>
          <details v-if="stepTechnicalDetail(step)">
            <summary>{{ t('ai.work.run.contentDetails') }}</summary>
            <pre>{{ stepTechnicalDetail(step) }}</pre>
          </details>
        </div>
        <i class="work-run__step-status" :class="step.status" />
      </article>
      <div v-if="stalled" class="work-run__recovery">
        <span>{{ t('ai.work.run.stalledDescription') }}</span>
        <div>
          <n-button size="tiny" @click="emit('continue-waiting')">{{ t('ai.work.run.continueWaiting') }}</n-button>
          <n-button size="tiny" @click="emit('stop')">{{ t('ai.work.run.stop') }}</n-button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { WorkStepRecord } from '@/db/workAssistant'
  import { formatJsonDisplay } from '@/utils/common/jsonDisplay'
  import { useI18n } from 'vue-i18n'

  const props = withDefaults(
    defineProps<{
      steps: WorkStepRecord[]
      running?: boolean
      stalled?: boolean
      startedAt?: number
    }>(),
    {
      running: false,
      stalled: false,
      startedAt: 0
    }
  )
  const emit = defineEmits<{ stop: []; 'continue-waiting': [] }>()
  const { t } = useI18n()
  const expanded = ref(false)
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined

  const summary = computed(() => {
    if (props.stalled) return t('ai.work.run.stalled')
    if (props.running) return t('ai.work.run.running')
    if (props.steps.some((step) => step.status === 'failed')) return t('ai.work.run.failed')
    if (props.steps.some((step) => step.status === 'cancelled')) return t('ai.work.run.cancelled')
    return t('ai.work.run.completed', { count: props.steps.length })
  })
  const elapsedLabel = computed(() => {
    if (!props.startedAt) return ''
    const seconds = Math.max(1, Math.round((now.value - props.startedAt) / 1000))
    return t('ai.work.run.elapsed', { seconds })
  })

  const stepIcon = (kind: string) =>
    ({ read: '#document', edit: '#edit', execute: '#terminal', search: '#search', plan: '#list' })[kind] || '#settings'

  const stepTechnicalDetail = (step: WorkStepRecord) => {
    try {
      const payload = JSON.parse(step.payloadJson) as Record<string, unknown>
      return formatJsonDisplay(payload.rawInput || payload.content || payload.output || payload)
    } catch {
      return formatJsonDisplay(step.payloadJson)
    }
  }

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })
</script>

<style scoped lang="scss">
  .work-run {
    width: min(720px, calc(100% - 44px));
    margin: 3px auto 8px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: color-mix(in srgb, var(--bg-secondary-color) 90%, var(--card-bg-color));
    overflow: hidden;
    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 38px;
      padding: 0 11px;
      border: 0;
      background: transparent;
      color: var(--text-secondary-color);
      cursor: pointer;
    }
    &__header > span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 10px;
      line-height: 1;
    }
    &__header strong {
      color: var(--text-color);
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
    }
    &__header svg {
      display: block;
      width: 12px;
      height: 12px;
      transform: rotate(-90deg);
      transition: transform 0.15s ease;
      &.expanded {
        transform: rotate(90deg);
      }
    }
    &__state > i {
      flex: none;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary-color);
      &.running {
        box-shadow: 0 0 7px color-mix(in srgb, var(--primary-color) 60%, transparent);
        animation: work-run-pulse 1.2s infinite;
      }
      &.stalled {
        background: var(--yellow);
      }
    }
    &__body {
      padding: 3px 10px 9px;
      border-top: 1px solid color-mix(in srgb, var(--divider-color) 72%, transparent);
    }
    &__step {
      display: grid;
      grid-template-columns: 27px minmax(0, 1fr) 10px;
      align-items: start;
      gap: 8px;
      padding: 7px 2px;
    }
    &__step-icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 27px;
      height: 27px;
      border-radius: 7px;
      background: var(--bg-muted-color);
      color: var(--text-secondary-color);
      &.in_progress,
      &.waiting_approval {
        color: var(--primary-color);
      }
    }
    &__step-icon svg {
      display: block;
      width: 13px;
      height: 13px;
    }
    &__step > div {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      min-height: 27px;
    }
    &__step strong {
      display: flex;
      align-items: center;
      min-height: 27px;
      color: var(--text-color);
      font-size: 11px;
      font-weight: 500;
      line-height: 1.3;
    }
    &__step small {
      margin-top: 2px;
      overflow: hidden;
      color: var(--text-secondary-color);
      font-size: 9px;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    details {
      margin-top: 5px;
      color: var(--text-muted-color);
      font-size: 9px;
    }
    pre {
      max-height: 150px;
      margin: 5px 0 0;
      overflow: auto;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--bg-primary-color);
      color: var(--text-secondary-color);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }
    &__step-status {
      width: 7px;
      height: 7px;
      margin-top: 10px;
      border-radius: 50%;
      background: var(--text-muted-color);
      &.completed {
        background: var(--primary-color);
      }
      &.in_progress {
        background: var(--primary-color);
      }
      &.waiting_approval {
        background: var(--yellow);
      }
      &.failed {
        background: var(--red);
      }
    }
    &__recovery {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 5px;
      padding: 8px;
      border-radius: 7px;
      background: color-mix(in srgb, var(--yellow) 8%, var(--bg-muted-color));
      color: var(--text-secondary-color);
      font-size: 10px;
    }
    &__recovery > div {
      display: flex;
      gap: 6px;
    }
  }

  @keyframes work-run-pulse {
    50% {
      opacity: 0.45;
    }
  }
</style>
