"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import {
  type ThemeProfile,
  THEMES,
  THEME_STORAGE_KEY,
  PRESENTATION_STORAGE_KEY,
  DEFAULT_THEME,
} from "./themes"

interface ThemeContextValue {
  profile: ThemeProfile
  setProfile: (p: ThemeProfile) => void
  presentation: boolean
  setPresentation: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  profile: DEFAULT_THEME,
  setProfile: () => {},
  presentation: false,
  setPresentation: () => {},
})

export function useThemeProfile() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<ThemeProfile>(DEFAULT_THEME)
  const [presentation, setPresentationState] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    let cancelled = false
    requestAnimationFrame(() => {
      if (cancelled) return
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (stored && Object.keys(THEMES).includes(stored) && stored !== DEFAULT_THEME) {
          setProfileState(stored as ThemeProfile)
        }
        const pres = localStorage.getItem(PRESENTATION_STORAGE_KEY)
        if (pres === "true") {
          setPresentationState(true)
        }
      } catch {
        // localStorage unavailable
      }
      if (!cancelled) setMounted(true)
    })
    return () => { cancelled = true }
  }, [])

  // Apply theme to <html>
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    const definition = THEMES[profile]

    // Set data-theme attribute
    root.setAttribute("data-theme", profile)

    // Apply CSS variables
    for (const [key, value] of Object.entries(definition.tokens)) {
      root.style.setProperty(key, value)
    }

    // Dark class for shadcn compatibility
    if (profile === "lab-light") {
      root.classList.remove("dark")
    } else {
      root.classList.add("dark")
    }

    // Persist
    try {
      localStorage.setItem(THEME_STORAGE_KEY, profile)
    } catch {
      // ignore
    }
  }, [profile, mounted])

  // Presentation mode
  useEffect(() => {
    if (!mounted) return
    if (presentation) {
      document.documentElement.classList.add("presentation-mode")
    } else {
      document.documentElement.classList.remove("presentation-mode")
    }
    try {
      localStorage.setItem(PRESENTATION_STORAGE_KEY, String(presentation))
    } catch {
      // ignore
    }
  }, [presentation, mounted])

  const setProfile = useCallback((p: ThemeProfile) => {
    setProfileState(p)
  }, [])

  const setPresentation = useCallback((v: boolean) => {
    setPresentationState(v)
  }, [])

  return (
    <ThemeContext.Provider value={{ profile, setProfile, presentation, setPresentation }}>
      {children}
    </ThemeContext.Provider>
  )
}
