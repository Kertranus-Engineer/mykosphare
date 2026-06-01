"use client"

import { useState, useEffect, useCallback } from "react"
import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { TelemetryRow } from "@/lib/services/telemetry-service"
import type { CorrelatedCapture } from "@/lib/correlation/correlation-engine"
import { fetchTelemetryRange } from "@/lib/services/telemetry-service"
import { generateEvents, getEventsForCapture, getEventsByWindow, type EnvironmentalEvent, type EventGenerationResult } from "@/lib/events/event-engine"

interface UseEventsResult {
  events: EnvironmentalEvent[]
  stats: EventGenerationResult["stats"]
  loading: boolean
  error: string | null
  getForCapture: (captureId: string) => EnvironmentalEvent[]
  getByWindow: (timestamp: string, windowMs?: number) => EnvironmentalEvent[]
  regenerate: () => void
}

export function useEvents(
  captures: ProcessedCapture[],
  correlated: CorrelatedCapture[],
): UseEventsResult {
  const [events, setEvents] = useState<EnvironmentalEvent[]>([])
  const [stats, setStats] = useState<EventGenerationResult["stats"]>({
    total: 0, info: 0, warning: 0, critical: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const regenerate = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)

      try {
        let telemetryEntries: TelemetryRow[] = []

        if (captures.length > 0) {
          const sorted = [...captures].sort(
            (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
          )
          const from = new Date(new Date(sorted[0].uploadedAt).getTime() - 600_000).toISOString()
          const to = new Date(new Date(sorted[sorted.length - 1].uploadedAt).getTime() + 600_000).toISOString()

          try {
            telemetryEntries = await fetchTelemetryRange(from, to)
          } catch {
            telemetryEntries = []
          }
        }

        if (cancelled) return

        const result = generateEvents({
          telemetry: telemetryEntries,
          captures,
          correlated,
        })

        setEvents(result.events)
        setStats(result.stats)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Event generation failed")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [captures, correlated, tick])

  const getForCapture = useCallback(
    (captureId: string) => getEventsForCapture(events, captureId),
    [events],
  )

  const getByWindow = useCallback(
    (timestamp: string, windowMs?: number) => getEventsByWindow(events, timestamp, windowMs),
    [events],
  )

  return { events, stats, loading, error, getForCapture, getByWindow, regenerate }
}
