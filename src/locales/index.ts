import { createI18n } from 'vue-i18n'
import { LangEnum } from '@/constants/system'
import zh from '@/locales/zh'

export const i18n = createI18n({
  legacy: false,
  locale: LangEnum.ZH,
  fallbackLocale: LangEnum.ZH,
  messages: {
    [LangEnum.ZH as string]: zh
  }
})

const loadedLanguages: string[] = []

// 动态加载语言
export async function loadLanguage(lang: LangEnum) {
  if (loadedLanguages.includes(lang)) {
    i18n.global.locale.value = lang
    return
  }
  // 动态 import
  const messages = await import(`./${lang}.ts`)
  i18n.global.setLocaleMessage(lang, messages.default)
  i18n.global.locale.value = lang
  loadedLanguages.push(lang)
}
