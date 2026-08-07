<template>
  <n-modal :show="show" :mask-closable="false" @esc="emit('answer')">
    <div class="work-permission" role="dialog">
      <header class="work-permission__header">
        <strong>{{ t('ai.work.permission.title') }}</strong>
        <button type="button" class="work-permission__close" @click="emit('answer')">
          <svg><use href="#close" /></svg>
        </button>
      </header>

      <div class="work-permission__body">
        <div v-if="request" class="work-permission__content">
          <span class="work-permission__icon">
            <svg><use href="#ai" /></svg>
          </span>
          <div class="work-permission__main">
            <strong>{{ request.title }}</strong>
            <p>{{ t('ai.work.permission.description') }}</p>
            <n-collapse v-if="detail">
              <n-collapse-item :title="t('ai.work.permission.contentDetails')" name="detail">
                <pre>{{ detail }}</pre>
              </n-collapse-item>
            </n-collapse>
          </div>
        </div>
      </div>

      <footer class="work-permission__footer">
        <n-button @click="emit('answer')">{{ t('ai.work.permission.reject') }}</n-button>
        <n-button
          v-for="option in allowOptions"
          :key="option.optionId"
          :type="option.kind === 'allow_once' ? 'primary' : 'default'"
          @click="emit('answer', option.optionId)">
          {{ t(`ai.work.permission.options.${option.kind}`, option.name) }}
        </n-button>
      </footer>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
  import { formatJsonDisplay } from '@/utils/common/jsonDisplay'
  import type { WorkPermissionRequest } from '@/types/cmd/work'
  import { useI18n } from 'vue-i18n'

  const props = defineProps<{ show: boolean; request: WorkPermissionRequest | null }>()
  const emit = defineEmits<{ answer: [optionId?: string] }>()
  const { t } = useI18n()
  const detail = computed(() => formatJsonDisplay(props.request?.rawInput))
  const allowOptions = computed(() => props.request?.options.filter((option) => option.kind.startsWith('allow')) || [])
</script>

<style scoped lang="scss">
  .work-permission {
    display: flex;
    flex-direction: column;
    width: min(520px, calc(100vw - 32px));
    max-height: 520px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-primary-color);
    color: var(--text-color);
    box-shadow: 0 12px 40px rgb(0 0 0 / 18%);

    &__header {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    &__header strong {
      font-size: 15px;
      font-weight: 600;
    }

    &__close {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--text-muted-color);
      cursor: pointer;
      &:hover {
        background: var(--bg-muted-color);
        color: var(--text-color);
      }
      svg {
        width: 16px;
        height: 16px;
      }
    }

    &__body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 14px 16px;
    }

    &__content {
      display: flex;
      gap: 13px;
    }

    &__main {
      flex: 1;
      min-width: 0;
    }

    &__icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--yellow) 12%, var(--bg-muted-color));
      color: var(--yellow);
    }

    &__icon svg {
      width: 19px;
      height: 19px;
    }

    p {
      margin: 5px 0 10px;
      color: var(--text-secondary-color);
      font-size: 11px;
    }

    pre {
      margin: 0;
      padding: 10px 12px;
      border-radius: 7px;
      background: var(--bg-muted-color);
      color: var(--text-secondary-color);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    &__footer {
      display: flex;
      flex: 0 0 auto;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 7px;
      padding: 4px 16px 14px;
      background: var(--bg-primary-color);
    }
  }
</style>
