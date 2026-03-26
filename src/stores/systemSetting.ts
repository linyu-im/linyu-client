import { defineStore } from 'pinia'
import { setTheme } from '@tauri-apps/api/app'
import { Theme } from '@tauri-apps/api/window'
import { ThemePatternEnum, ThemeSchemeEnum, LangEnum } from '@/constants/system'
import { loadLanguage } from '@/locales'

type SystemSetting = {
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
  state: (): SystemSetting => {
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
    setThemePattern(pattern: ThemePatternEnum) {
      this.$patch((state) => {
        state.themes.pattern = pattern
      })
      setTheme(Object.is(pattern, 'os') ? null : (pattern as Theme))
      document.documentElement.dataset.theme = pattern as string
    },
    setLang(lang: LangEnum) {
      this.$patch((state) => {
        state.preferences.lang = lang
      })
      loadLanguage(lang)
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
