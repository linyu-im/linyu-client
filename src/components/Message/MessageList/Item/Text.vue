<template>
  <div class="message-text">
    <template v-if="highlightKeyword && displayText">
      <template v-for="(segment, index) in getHighlightSegments(displayText, highlightKeyword)" :key="index">
        <span :class="{ 'message-text__highlight': segment.highlight }">{{ segment.text }}</span>
      </template>
    </template>
    <template v-else>{{ displayText }}</template>
  </div>
</template>

<script setup lang="ts">
  import type { TextContent } from '@/types/api/message'
  import { getHighlightSegments } from '@/utils/common/highlight'

  const props = defineProps<{
    content: TextContent
    highlightKeyword?: string
  }>()

  const displayText = computed(() => props.content?.text || '')
</script>

<style scoped lang="scss">
  .message-text {
    width: fit-content;
    max-width: 100%;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;

    &__highlight {
      color: var(--primary-color);
      font-weight: 600;
    }
  }
</style>
