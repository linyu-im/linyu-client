<template>
  <div class="ai-message-body" :class="{ 'ai-message-body--streaming': streaming }">
    <editor-content :editor="editor" class="ai-message-body__editor" />
  </div>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, watch } from 'vue'
  import { EditorContent, useEditor } from '@tiptap/vue-3'
  import { generateJSON } from '@tiptap/html'
  import { createAiReaderExtensions } from './utils/readerExtensions'
  import { aiMarkdownToHtml } from './utils/markdown'
  import 'katex/dist/katex.min.css'

  const props = withDefaults(
    defineProps<{
      content?: string
      streaming?: boolean
    }>(),
    {
      content: '',
      streaming: false
    }
  )

  const extensions = createAiReaderExtensions()

  const editor = useEditor({
    editable: false,
    extensions,
    content: '',
    editorProps: {
      attributes: {
        class: 'ai-message-body__prose'
      }
    }
  })

  let syncRaf = 0
  let lastSerialized = ''

  const syncContent = (raw: string) => {
    const inst = editor.value
    if (!inst) return

    const source = raw ?? ''
    if (source === lastSerialized && !props.streaming) return

    try {
      const html = aiMarkdownToHtml(source)
      const json = generateJSON(html, extensions)
      inst.commands.setContent(json, { emitUpdate: false })
      lastSerialized = source
    } catch {
      inst.commands.setContent(
        {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: source }] }]
        },
        { emitUpdate: false }
      )
      lastSerialized = source
    }
  }

  watch(
    () => props.content,
    (val) => {
      cancelAnimationFrame(syncRaf)
      syncRaf = requestAnimationFrame(() => syncContent(val))
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    cancelAnimationFrame(syncRaf)
    editor.value?.destroy()
  })
</script>

<style lang="scss">
  .ai-message-body {
    width: 100%;
    max-width: 100%;
    min-width: 0;

    &__editor {
      width: 100%;
    }

    /* ProseMirror 在块末插入的占位 br，只读展示不需要 */
    .ProseMirror-trailingBreak {
      display: none !important;
    }

    &__prose {
      outline: none;
      color: var(--text-color);
      font-size: 14px;
      line-height: 1.65;
      word-break: break-word;
      max-width: 100%;

      /* 长内容时撑满气泡上限，短内容随文字收缩 */
      & > * {
        max-width: 100%;
      }

      > *:first-child {
        margin-top: 0;
      }

      > *:last-child {
        margin-bottom: 0;
      }

      p {
        margin: 0 0 0.65em;
      }

      h1,
      h2,
      h3,
      h4 {
        margin: 0.9em 0 0.45em;
        font-weight: 600;
        line-height: 1.35;
        color: var(--text-color);
      }

      h1 {
        font-size: 1.35em;
      }

      h2 {
        font-size: 1.2em;
      }

      h3 {
        font-size: 1.08em;
      }

      ul,
      ol {
        margin: 0.4em 0 0.65em;
        padding-left: 1.35em;
      }

      li {
        margin: 0.2em 0;
      }

      blockquote {
        margin: 0.6em 0;
        padding: 0.35em 0 0.35em 12px;
        border-left: 3px solid color-mix(in srgb, var(--primary-color) 55%, var(--border-color));
        color: var(--text-muted-color);
      }

      hr {
        margin: 0.8em 0;
        border: none;
        border-top: 1px solid var(--divider-color);
      }

      code {
        padding: 0.1em 0.35em;
        border-radius: 4px;
        background: color-mix(in srgb, var(--card-bg-color) 80%, transparent);
        font-size: 0.92em;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .ai-code-block code {
        padding: 0;
        border-radius: 0;
        background: transparent;
        font-size: inherit;
      }

      pre:not(.ai-code-block__pre) {
        margin: 0.65em 0;
        padding: 0;
        background: transparent;
      }

      .ai-message-body__image {
        display: block;
        max-width: 100%;
        margin: 0.5em 0;
        border-radius: 8px;
      }

      .ai-message-body__link {
        color: var(--primary-color);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      table {
        width: 100%;
        margin: 0.65em 0;
        border-collapse: collapse;
        font-size: 13px;
      }

      th,
      td {
        padding: 6px 10px;
        border: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
      }

      th {
        background: color-mix(in srgb, var(--card-bg-color) 60%, transparent);
        font-weight: 600;
      }
    }

    &--streaming .ai-message-body__prose > *:last-child::after {
      content: '';
      display: inline-block;
      width: 2px;
      height: 1em;
      margin-left: 2px;
      vertical-align: text-bottom;
      background-color: var(--primary-color);
      animation: ai-message-stream-cursor 1s step-end infinite;
    }
  }

  @keyframes ai-message-stream-cursor {
    50% {
      opacity: 0;
    }
  }
</style>
