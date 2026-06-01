"use client"

import { useMemo } from "react"
import type { EnvironmentalEvent } from "@/lib/events/event-engine"
import {
  generateObservations,
  getObservationsForCapture,
  type Observation,
  type ObservationGenerationResult,
} from "@/lib/observations/observation-engine"

interface UseObservationsResult {
  observations: Observation[]
  stats: ObservationGenerationResult["stats"]
  getForCapture: (captureId: string) => Observation[]
}

export function useObservations(events: EnvironmentalEvent[]): UseObservationsResult {
  const safeEvents = events ?? []
  const result = useMemo(() => {
    if (safeEvents.length === 0) return { observations: [], stats: { total: 0, info: 0, warning: 0, critical: 0 } }
    return generateObservations(safeEvents)
  }, [safeEvents])

  const getForCapture = useMemo(
    () => (captureId: string) => getObservationsForCapture(result.observations, safeEvents, captureId),
    [result.observations, safeEvents],
  )

  return {
    observations: result.observations,
    stats: result.stats,
    getForCapture,
  }
}
