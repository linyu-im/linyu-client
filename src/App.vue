<template>
  <main class="container">
    <h1>Welcome to Linyu</h1>
    <div class="row">
      <img src="/linyu.svg" class="logo vite" alt="Vite logo" />
    </div>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <button @click="setThemePattern">{{ themePattern }}</button>
    <div>
      <p class="bg-blue-500">{{ greetMsg }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
  import { nextTick, ref, watch } from 'vue'
  import { invoke } from '@tauri-apps/api/core'
  import { useSystemSettingStore } from './stores/systemSetting'
  import { ThemePatternEnum } from './constants/system'
  const systemSetting = useSystemSettingStore()
  const themePattern = ref('')

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

  const setThemePattern = () => {
    themePattern.value = themePattern.value === ThemePatternEnum.DARK ? ThemePatternEnum.LIGHT : ThemePatternEnum.DARK
    systemSetting.setThemePattern(themePattern.value as ThemePatternEnum)
  }

  const greetMsg = ref('')
  const name = ref('')

  async function greet() {
    greetMsg.value = await invoke('greet', { name: name.value })
  }
</script>

<style scoped>
  .container {
    height: 100vh;
    width: 100vw;
    background: var(--primary-bg);
  }
</style>
