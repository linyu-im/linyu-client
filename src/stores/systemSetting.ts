import { defineStore } from 'pinia'
import { setTheme } from '@tauri-apps/api/app'
import { Theme } from '@tauri-apps/api/window'
import { ThemePatternEnum, ThemeSchemeEnum, LangEnum } from '@/constants/system'

type SystemSettingStore = {
  themes: {
    //主题模式
    pattern: ThemePatternEnum
    //主题方案
    scheme: ThemeSchemeEnum
  }
  preferences: {
    //语言
    lang: LangEnum
  }
}

export const useSystemSettingStore = defineStore('systemSetting', {
  persist: true,
  state: (): SystemSettingStore => {
    return {
      themes: {
        pattern: ThemePatternEnum.LIGHT,
        scheme: ThemeSchemeEnum.DEFALUT
      },
      preferences: {
        lang: LangEnum.ZH
      }
    }
  },
  actions: {
    initSetting() {
      this.setThemePattern(this.themes.pattern)
      this.setLang(this.preferences.lang)
    },
    setThemePattern(pattern: ThemePatternEnum) {
      this.$patch((state) => {
        state.themes.pattern = pattern
      })
      let actualPattern = pattern
      if (pattern === ThemePatternEnum.OS) {
        actualPattern = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? ThemePatternEnum.DARK
          : ThemePatternEnum.LIGHT
      }
      setTheme(Object.is(pattern, 'os') ? null : (actualPattern as Theme))
      document.documentElement.dataset.theme = actualPattern as string
    },
    setLang(lang: LangEnum) {
      this.$patch((state) => {
        state.preferences.lang = lang
      })
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
