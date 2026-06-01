"use client"

import { useEffect, useState, useCallback } from "react"
import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { TelemetryRow } from "@/lib/services/telemetry-service"
import { fetchTelemetryRange } from "@/lib/services/telemetry-service"
import { correlateBatch, computeBatchStats, type CorrelatedCapture } from "@/lib/correlation/correlation-engine"

interface UseCorrelationResult {
  results: CorrelatedCapture[]
  stats: ReturnType<typeof computeBatchStats>
  loading: boolean
  error: string | null
  recalculate: () => void
}

export function useCorrelation(
  captures: ProcessedCapture[],
): UseCorrelationResult {
  const [results, setResults] = useState<CorrelatedCapture[]>([])
  const [stats, setStats] = useState(computeBatchStats([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const recalculate = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (captures.length === 0) {
        setResults([])
        setStats(computeBatchStats([]))
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const sorted = [...captures].sort(
          (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
        )

        const from = new Date(new Date(sorted[0].uploadedAt).getTime() - 600_000).toISOString()
        const to = new Date(new Date(sorted[sorted.length - 1].uploadedAt).getTime() + 600_000).toISOString()

        let telemetryEntries: TelemetryRow[] = []
        try {
          telemetryEntries = await fetchTelemetryRange(from, to)
        } catch {
          telemetryEntries = []
        }

        if (cancelled) return

        const correlated = correlateBatch(captures, telemetryEntries)
        const batchStats = computeBatchStats(correlated)

        setResults(correlated)
        setStats(batchStats)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Correlation failed")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [captures, tick])

  return { results, stats, loading, error, recalculate }
}

export function getCorrelationForCapture(
  results: CorrelatedCapture[],
  captureId: string,
): CorrelatedCapture | null {
  return results.find((r) => r.capture.id === captureId) ?? null
}
