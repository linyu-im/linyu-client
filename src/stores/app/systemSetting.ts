import { defineStore } from 'pinia'
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
  network: {
    // 自定义后端服务地址；空字符串表示使用默认地址
    serviceUrl: string
  }
}

export const useSystemSettingStore = defineStore('systemSetting', {
  persist: true,
  state: (): SystemSettingStore => {
    return {
      themes: {
        pattern: ThemePatternEnum.DARK,
        scheme: ThemeSchemeEnum.DEFALUT
      },
      preferences: {
        lang: LangEnum.ZH
      },
      network: {
        serviceUrl: ''
      }
    }
  },
  actions: {
    setThemePattern(pattern: ThemePatternEnum) {
      this.$patch((state) => {
        state.themes.pattern = pattern
      })
    },
    sycnOsTheme() {
      if (this.themes.pattern !== ThemePatternEnum.OS) return
      const actualPattern = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? ThemePatternEnum.DARK
        : ThemePatternEnum.LIGHT
      document.documentElement.dataset.theme = actualPattern as string
    },
    setLang(lang: LangEnum) {
      this.$patch((state) => {
        state.preferences.lang = lang
      })
    },
    setNetworkServiceUrl(serviceUrl: string) {
      this.$patch((state) => {
        if (!state.network) {
          state.network = { serviceUrl: '' }
        }
        state.network.serviceUrl = serviceUrl.trim().replace(/\/+$/, '')
      })
    }
  },
  share: {
    enable: true,
    initialize: true
  }
})
