<template>
  <node-view-wrapper as="span" class="ai-math-inline">
    <span ref="rootRef" class="ai-math-inline__content" />
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
      katex.render(latex.value, el, { displayMode: false, throwOnError: false })
    } catch {
      el.textContent = latex.value
    }
  }

  onMounted(renderMath)
  watch(latex, renderMath)
</script>

<style scoped lang="scss">
  .ai-math-inline {
    display: inline;
  }
</style>
