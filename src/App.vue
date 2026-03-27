<template>
  <main class="h-100vh w-100vw">
    <router-view />
  </main>
</template>

<script setup lang="ts">
  import { nextTick, watch } from 'vue'
  import { useSystemSettingStore } from '@/stores/systemSetting'

  const systemSetting = useSystemSettingStore()

  watch(
    () => systemSetting.themes.scheme,
    async (val, oldVal) => {
      await import(`@/styles/theme/${val}.scss`)
      const app = document.querySelector('#app')?.classList as DOMTokenList
      app.remove(oldVal as string)
      await nextTick(() => {
        app.add(val)
      })
    },
    {
      immediate: true
    }
  )
</script>

<style scoped></style>
