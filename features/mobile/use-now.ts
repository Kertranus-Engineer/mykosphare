"use client"

import { useEffect, useState } from "react"

/**
 * Current time, ticking every `intervalMs`. Returns null on the server and on
 * the first client render so relative-time labels never cause a hydration mismatch.
 */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0)
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [intervalMs])

  return now
}
