"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Observation } from "@/lib/observations/observation-engine"
import {
  generateTrends,
  getTrendsForCapture,
  type Trend,
  type TrendGenerationResult,
} from "@/lib/trends/trend-engine"

const EMPTY_RESULT: TrendGenerationResult = {
  trends: [],
  stats: { total: 0, improving: 0, stable: 0, degrading: 0 },
}

interface UseTrendsResult {
  trends: Trend[]
  stats: TrendGenerationResult["stats"]
  getForCapture: (captureObservations: Observation[]) => Trend[]
}

export function useTrends(observations: Observation[]): UseTrendsResult {
  const safeObservations = observations ?? []
  const prevRef = useRef<Observation[]>([])
  const [result, setResult] = useState<TrendGenerationResult>(EMPTY_RESULT)

  useEffect(() => {
    if (safeObservations.length === 0) {
      setResult(EMPTY_RESULT)
      return
    }
    const previous = prevRef.current
    prevRef.current = safeObservations
    setResult(generateTrends(safeObservations, previous))
  }, [safeObservations])

  const getForCapture = useCallback(
    (captureObservations: Observation[]) =>
      getTrendsForCapture(result.trends, captureObservations),
    [result.trends],
  )

  return {
    trends: result.trends,
    stats: result.stats,
    getForCapture,
  }
}
