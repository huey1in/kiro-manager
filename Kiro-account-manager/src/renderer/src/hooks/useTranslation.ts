/**
 * useTranslation hook
 * 简化 i18n 使用的 React hook
 */

import { useMemo } from 'react'
import { useAccountsStore } from '@/store/accounts'
import en from '@/i18n/locales/en'
import zh from '@/i18n/locales/zh'

type Language = 'auto' | 'en' | 'zh'

interface Translations {
  [key: string]: string | Translations
}

const locales: Record<string, Translations> = { en, zh }

/**
 * 检测系统语言
 */
function detectSystemLanguage(): 'en' | 'zh' {
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) return 'zh'
  return 'en'
}

/**
 * 获取实际使用的语言
 */
function getActualLanguage(language: Language): 'en' | 'zh' {
  if (language === 'auto') {
    return detectSystemLanguage()
  }
  return language
}

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
 * 翻译函数
 */
function translate(key: string, language: 'en' | 'zh', params?: Record<string, string | number>): string {
  let text = getNestedValue(locales[language] || locales.en, key)
  
  // 替换参数
  if (params && text !== key) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
    })
  }
  
  return text
}

/**
 * useTranslation hook
 * @returns { t, language, actualLanguage }
 */
export function useTranslation() {
  const language = useAccountsStore((state) => state.language)
  
  const actualLanguage = useMemo(() => getActualLanguage(language), [language])
  
  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>) => {
      return translate(key, actualLanguage, params)
    }
  }, [actualLanguage])
  
  return {
    t,
    language,
    actualLanguage
  }
}

export default useTranslation
