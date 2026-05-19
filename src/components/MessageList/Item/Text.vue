<template>
  <div class="message-text">{{ content.text }}</div>
</template>

<script setup lang="ts">
  import type { TextContent } from '@/types/api/message'

  defineProps<{
    content: TextContent
  }>()
</script>

<style scoped lang="scss">
  .message-text {
    width: fit-content;
    max-width: 100%;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
