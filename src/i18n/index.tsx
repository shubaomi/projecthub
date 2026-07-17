import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { en } from './en'
import { zh } from './zh'

export type Language = 'en' | 'zh'

const dictionaries = { en, zh }

type Dictionary = typeof en

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children, initialLang = 'en' }: { children: ReactNode; initialLang?: Language }) {
  const [lang, setLangState] = useState<Language>(initialLang)

  useEffect(() => {
    setLangState(initialLang)
  }, [initialLang])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict: Dictionary = dictionaries[lang]
    let text = dict[key as keyof Dictionary] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
