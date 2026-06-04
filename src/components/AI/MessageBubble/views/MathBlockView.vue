<template>
  <node-view-wrapper class="ai-math-block">
    <div ref="rootRef" class="ai-math-block__content" />
  </node-view-wrapper>
</template>

<script setup lang="ts">
  import { NodeViewWrapper } from '@tiptap/vue-3'
  import type { NodeViewProps } from '@tiptap/vue-3'
  import katex from 'katex'
  import { computed, onMounted, ref, watch } from 'vue'

  const props = defineProps<NodeViewProps>()

  const rootRef = ref<HTMLElement | null>(null)

  const latex = computed(() => {
    const raw = props.node.attrs.latex as string
    if (!raw) return ''
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })

  const renderMath = () => {
    const el = rootRef.value
    if (!el) return
    try {
      katex.render(latex.value, el, { displayMode: true, throwOnError: false })
    } catch {
      el.textContent = latex.value
    }
  }

  onMounted(renderMath)
  watch(latex, renderMath)
</script>

<style scoped lang="scss">
  .ai-math-block {
    display: block;
    margin: 10px 0;
    overflow-x: auto;
  }

  .ai-math-block__content {
    font-size: 1.05em;
  }
</style>
