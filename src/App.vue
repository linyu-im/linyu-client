<template>
  <div class="h-100vh w-100vw">
    <linyu-provider>
      <router-view />
    </linyu-provider>
  </div>
</template>

<script setup lang="ts">
  import { nextTick, watch } from 'vue'
  import { useSystemSettingStore } from '@/stores/systemSetting'
  import LinyuProvider from './components/LinyuProvider.vue'

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
