"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { Language, LocaleDict } from "./types"
import { en } from "./en"
import { es } from "./es"

const DICTIONARIES: Record<Language, LocaleDict> = { en, es }
const STORAGE_KEY = "mykosphare_language"
const DEFAULT_LOCALE: Language = "es"

interface LocaleContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always start with default locale to prevent hydration mismatch
  const [language, setLanguageState] = useState<Language>(DEFAULT_LOCALE)
  const [hydrated, setHydrated] = useState(false)

  // After mount, sync with localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "es" || stored === "en") {
        if (stored !== language) setLanguageState(stored)
      }
    } catch {}
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  }, [])

  const t = useCallback(
    (key: string): string => {
      return DICTIONARIES[language][key] ?? DICTIONARIES.es[key] ?? key
    },
    [language]
  )

  return (
    <LocaleContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}
