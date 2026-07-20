<template>
  <div class="message-time">
    {{ formatTime(time) }}
  </div>
</template>

<script setup lang="ts">
  import { formatTime } from '@/utils/common/time'

  defineProps<{
    time: string
  }>()
</script>

<style scoped lang="scss">
  .message-time {
    align-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1;
    color: var(--text-secondary-color);
    background: var(--bg-primary-color);
    user-select: none;
  }
</style>
