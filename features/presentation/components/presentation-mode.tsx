"use client"

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react"

interface PresentationContextType {
  enabled: boolean
  toggle: () => void
  enable: () => void
  disable: () => void
}

const PresentationContext = createContext<PresentationContextType>({
  enabled: false,
  toggle: () => {},
  enable: () => {},
  disable: () => {},
})

const STORAGE_KEY = "mykosphare_presentation_mode"

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored === "true") {
      const t = setTimeout(() => setEnabled(true), 0)
      return () => clearTimeout(t)
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      sessionStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const enable = useCallback(() => {
    setEnabled(true)
    sessionStorage.setItem(STORAGE_KEY, "true")
  }, [])

  const disable = useCallback(() => {
    setEnabled(false)
    sessionStorage.setItem(STORAGE_KEY, "false")
  }, [])

  return (
    <PresentationContext.Provider value={{ enabled, toggle, enable, disable }}>
      {children}
    </PresentationContext.Provider>
  )
}

export function usePresentationMode() {
  return useContext(PresentationContext)
}
