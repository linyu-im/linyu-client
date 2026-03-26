<template>
  <main class="container">
    <h1>{{ $t('common.hello') }}! {{ $t('common.welcome') }} to Linyu</h1>
    <div class="row">
      <img src="/linyu.svg" class="logo vite" alt="Vite logo" />
    </div>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <button @click="setThemePattern">切换模式</button>
    <button @click="setLang">切换语言</button>
    <div>
      <p class="bg-blue-500">{{ greetMsg }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
  import { nextTick, ref, watch } from 'vue'
  import { invoke } from '@tauri-apps/api/core'
  import { useSystemSettingStore } from '@/stores/systemSetting'
  import { ThemePatternEnum, LangEnum } from '@/constants/system'

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

  const setThemePattern = () => {
    systemSetting.setThemePattern(
      systemSetting.themes.pattern === ThemePatternEnum.DARK ? ThemePatternEnum.LIGHT : ThemePatternEnum.DARK
    )
  }

  const setLang = () => {
    systemSetting.setLang(systemSetting.preferences.lang === LangEnum.ZH ? LangEnum.EN : LangEnum.ZH)
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
