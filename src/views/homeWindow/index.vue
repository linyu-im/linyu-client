<template>
  <div class="container">
    <h1>首页窗口</h1>
    <div>当前用户：{{ userStore.userInfo.userId }}</div>
    <div>当前用户token：{{ userStore.userInfo.token }}</div>
  </div>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/stores/user'

  const userStore = useUserStore()
</script>
