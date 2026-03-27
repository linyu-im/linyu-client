<template>
  <div class="container">
    <h1>登录窗口</h1>
    <button @click="onLogin">登录</button>
  </div>
</template>

<script setup lang="ts">
  import { createWebviewWindow } from '@/utils/window'

  const onLogin = () => {
    createWebviewWindow('Linyu', 'home', { width: 600, height: 400 })
  }
</script>
