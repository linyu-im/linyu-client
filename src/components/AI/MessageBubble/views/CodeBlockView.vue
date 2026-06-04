<template>
  <node-view-wrapper class="ai-code-block">
    <div class="ai-code-block__header">
      <span class="ai-code-block__lang">{{ languageLabel }}</span>
      <button type="button" class="ai-code-block__copy" @click="onCopy">
        <svg class="size-14px" aria-hidden="true">
          <use href="#document"></use>
        </svg>
        <span>{{ copied ? t('ai.messageBubble.copied') : t('ai.messageBubble.copyCode') }}</span>
      </button>
    </div>
    <pre class="ai-code-block__pre"><code v-html="highlightedHtml" /></pre>
  </node-view-wrapper>
</template>

<script setup lang="ts">
  import '../styles/codeHighlight.scss'
  import { NodeViewWrapper } from '@tiptap/vue-3'
  import type { NodeViewProps } from '@tiptap/vue-3'
  import { computed, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { highlightCodeToHtml } from '../utils/lowlight'

  const props = defineProps<NodeViewProps>()
  const { t } = useI18n()

  const copied = ref(false)
  let copiedTimer: ReturnType<typeof setTimeout> | null = null

  const languageLabel = computed(() => {
    const lang = props.node.attrs.language as string | null
    return lang && lang !== 'plaintext' ? lang : 'text'
  })

  const highlightedHtml = computed(() => {
    // 依赖 node 引用，流式更新时随 ProseMirror 同步重算高亮
    const { node } = props
    return highlightCodeToHtml(node.textContent, node.attrs.language as string | null)
  })

  const onCopy = async () => {
    const text = props.node.textContent.replace(/\n+$/, '')
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      if (copiedTimer) clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      window.$message?.error(t('ai.messageBubble.copyFailed'))
    }
  }
</script>

<style scoped lang="scss">
  .ai-code-block {
    display: block;
    margin: 12px 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
    background: color-mix(in srgb, var(--bg-primary-color) 94%, #000);

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      background: color-mix(in srgb, var(--card-bg-color) 55%, var(--bg-primary-color));
      border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, transparent);
      user-select: none;
    }

    &__lang {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary-color);
      text-transform: lowercase;
    }

    &__copy {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-secondary-color);
      font-size: 12px;
      cursor: pointer;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;

      &:hover {
        background: var(--icon-hover-color);
        color: var(--text-color);
      }
    }

    &__pre {
      margin: 0;
      padding: 14px 16px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.55;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre;

      code {
        display: block;
        padding: 0;
        background: transparent;
        font-size: inherit;
        line-height: inherit;
        white-space: inherit;
      }
    }
  }
</style>
