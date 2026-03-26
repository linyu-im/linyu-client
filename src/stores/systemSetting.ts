import { defineStore } from 'pinia'
import { setTheme } from '@tauri-apps/api/app'
import { Theme } from '@tauri-apps/api/window'
import { ThemePatternEnum, ThemeSchemeEnum } from '../constants/system'

type SystemSetting = {
  themes: {
    //主题模式
    pattern: ThemePatternEnum
    //主题方案
    scheme: ThemeSchemeEnum
  }
}

export const useSystemSettingStore = defineStore('systemSetting', {
  state: (): SystemSetting => {
    return {
      themes: {
        pattern: ThemePatternEnum.LIGHT,
        scheme: ThemeSchemeEnum.DEFALUT
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
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
