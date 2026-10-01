"use client"

import { useEffect, useRef, useState } from "react"
import { MYKO_ACTIVITY_DURATION, resolveMykoActivity, type MykoLiveActivity } from "@/lib/grow/presentation"
import type { MykoMood } from "@/lib/grow/types"

/**
 * Observes what the viewer actually saw — a reading with a NEW timestamp, the
 * mood returning to content, a tap — and plays the matching one-shot activity.
 * Read-only: it never writes GrowState or any data. The first observation of a
 * page only records the baseline (no "recovering" on load).
 */
export function useMykoActivity({ mood, signal, touches }: { mood: MykoMood; signal: string | null; touches: number }): MykoLiveActivity {
  const [transient, setTransient] = useState<MykoLiveActivity | null>(null)
  const seen = useRef<{ mood: MykoMood; signal: string | null; touches: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const previous = seen.current
    seen.current = { mood, signal, touches }
    if (!previous) return
    const next = resolveMykoActivity({
      mood,
      previousMood: previous.mood === mood ? null : previous.mood,
      signalChanged: signal !== null && signal !== previous.signal,
      touched: touches !== previous.touches,
    })
    const duration = MYKO_ACTIVITY_DURATION[next]
    if (duration === null) return
    setTransient(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setTransient(null), duration)
  }, [mood, signal, touches])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  if (mood === "uncertain" && transient !== "touched") return "waiting"
  return transient ?? "idle"
}
