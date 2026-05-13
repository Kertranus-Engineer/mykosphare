import { useState, useCallback } from "react"

const PREFIX = "mykosphare_"

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {}
}

export function usePersistedState<T>(
  key: string,
  initial: T
): [T, (next: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => safeGet(key, initial))

  const setPersisted = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next
        safeSet(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [state, setPersisted]
}

export function persistLogs<T>(key: string, logs: T[]) {
  safeSet(key, logs)
}

export function loadLogs<T>(key: string, fallback: T[]): T[] {
  return safeGet(key, fallback)
}
