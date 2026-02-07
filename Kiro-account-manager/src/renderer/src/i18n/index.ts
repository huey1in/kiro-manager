/**
 * 国际化 (i18n) 系统
 * 支持中英双语，可扩展本地翻译文件
 */

import { create } from 'zustand'
import en from './locales/en'
import zh from './locales/zh'

export type Language = 'en' | 'zh' | 'auto'

export interface Translations {
  [key: string]: string | Translations
}

// 内置翻译
const builtInLocales: Record<string, Translations> = {
  en,
  zh
}

// 自定义翻译（从本地文件加载）
let customLocales: Record<string, Translations> = {}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.')
  let current: Translations | string = obj
  
  for (const key of keys) {
    if (typeof current === 'string') return path
    if (current[key] === undefined) return path
    current = current[key]
  }
  
  return typeof current === 'string' ? current : path
}

/**
 * 检测系统语言
 */
export function detectSystemLanguage(): 'en' | 'zh' {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

/**
 * 获取实际使用的语言
 */
export function getActualLanguage(language: Language): 'en' | 'zh' {
  if (language === 'auto') {
    return detectSystemLanguage()
  }
  return language
}

/**
 * 翻译函数
 */
export function translate(key: string, language: 'en' | 'zh', params?: Record<string, string | number>): string {
  // 优先使用自定义翻译
  let text = getNestedValue(customLocales[language] || {}, key)
  
  // 如果自定义翻译没有，使用内置翻译
  if (text === key) {
    text = getNestedValue(builtInLocales[language] || builtInLocales.en, key)
  }
  
  // 替换参数
  if (params && text !== key) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
    })
  }
  
  return text
}

/**
 * 加载自定义翻译文件
 */
export async function loadCustomLocale(language: string, translations: Translations): Promise<void> {
  customLocales[language] = translations
}

/**
 * 清除自定义翻译
 */
export function clearCustomLocales(): void {
  customLocales = {}
}

/**
 * i18n Store
 */
interface I18nState {
  language: Language
  actualLanguage: 'en' | 'zh'
  setLanguage: (language: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const useI18n = create<I18nState>((set, get) => ({
  language: 'auto',
  actualLanguage: detectSystemLanguage(),
  
  setLanguage: (language: Language) => {
    const actualLanguage = getActualLanguage(language)
    set({ language, actualLanguage })
  },
  
  t: (key: string, params?: Record<string, string | number>) => {
    const { actualLanguage } = get()
    return translate(key, actualLanguage, params)
  }
}))

export default useI18n
