// src/i18n/index.ts
import { createI18n } from 'vue-i18n'
import zh from '@/locales/zh.json'
import { LangEnum } from '@/constants/system'

type MessageSchema = typeof zh

const i18n = createI18n<false>({
  legacy: false,
  locale: LangEnum.ZH,
  fallbackLocale: LangEnum.ZH,
  messages: {
    [LangEnum.ZH]: zh
  }
})

export default i18n

const loadedLanguages: string[] = [LangEnum.ZH]
const localeModules = import.meta.glob<{ default: MessageSchema }>('@/locales/*.json')

function setLanguage(lang: string): string {
  i18n.global.locale.value = lang
  document.querySelector('html')?.setAttribute('lang', lang)
  localStorage.setItem('lang', lang)
  return lang
}

export async function loadLanguage(lang: string): Promise<string> {
  const currentLocale = i18n.global.locale.value

  if (currentLocale === lang || loadedLanguages.includes(lang)) {
    return setLanguage(lang)
  }

  const loader = localeModules[`/src/locales/${lang}.json`]
  if (!loader) {
    console.warn(`[未找到语言包]: ${lang}`)
    return setLanguage(LangEnum.ZH)
  }

  try {
    const messages = await loader()
    i18n.global.setLocaleMessage(lang, messages.default)
    loadedLanguages.push(lang)
    return setLanguage(lang)
  } catch (e) {
    console.error(`[加载语言包失败]: ${lang}`, e)
    return setLanguage(LangEnum.ZH)
  }
}
