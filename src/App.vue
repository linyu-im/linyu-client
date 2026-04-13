<template>
  <div class="h-100vh w-100vw overflow-hidden">
    <linyu-provider>
      <router-view />
    </linyu-provider>
  </div>
</template>

<script setup lang="ts">
  import { nextTick, watch } from 'vue'
  import { useSystemSettingStore } from '@/stores/systemSetting'
  import LinyuProvider from './components/LinyuProvider.vue'
  import { loadLanguage } from './services/i18n'
  import { ThemePatternEnum } from './constants/system'
  import { setTheme } from '@tauri-apps/api/app'
  import { Theme } from '@tauri-apps/api/window'

  const systemSetting = useSystemSettingStore()

  watch(
    () => systemSetting.themes.scheme,
    async (val, oldVal) => {
      await import(`@/styles/theme/${val}.scss`)
      const app = document.querySelector('body')?.classList as DOMTokenList
      app.remove(oldVal as string)
      await nextTick(() => {
        app.add(val)
      })
    },
    {
      immediate: true
    }
  )

  watch(
    () => systemSetting.themes.pattern,
    (pattern) => {
      if (pattern !== ThemePatternEnum.OS) {
        setTheme(pattern as Theme)
        document.documentElement.dataset.theme = pattern as string
      } else {
        setTheme(null)
        systemSetting.sycnOsTheme()
      }
    },
    {
      immediate: true
    }
  )

  watch(
    () => systemSetting.preferences.lang,
    (val) => {
      loadLanguage(val)
    },
    {
      immediate: true
    }
  )
</script>

<style scoped></style>
