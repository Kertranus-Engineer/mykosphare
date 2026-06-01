"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type OperationalMode = "demo" | "live" | "autonomous"

interface ModeContextValue {
  mode: OperationalMode
  setMode: (m: OperationalMode) => void
  isDemo: boolean
  isLive: boolean
  isAutonomous: boolean
}

const STORAGE_KEY = "mykosphare_operational_mode"

function readStoredMode(): OperationalMode {
  if (typeof window === "undefined") return "demo"
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "demo" || stored === "live") return stored
  } catch { /* ignore */ }
  return "demo"
}

function writeStoredMode(m: OperationalMode) {
  try {
    localStorage.setItem(STORAGE_KEY, m)
  } catch { /* ignore */ }
}

const ModeContext = createContext<ModeContextValue>({
  mode: "demo",
  setMode: () => {},
  isDemo: true,
  isLive: false,
  isAutonomous: false,
})

export function useOperationalMode(): ModeContextValue {
  return useContext(ModeContext)
}

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<OperationalMode>(readStoredMode)

  const setMode = useCallback((m: OperationalMode) => {
    setModeState(m)
    writeStoredMode(m)
  }, [])

  useEffect(() => {
    const stored = readStoredMode()
    if (stored !== mode) setModeState(stored)
  }, [])

  const value: ModeContextValue = {
    mode,
    setMode,
    isDemo: mode === "demo",
    isLive: mode === "live",
    isAutonomous: mode === "autonomous",
  }

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  )
}
