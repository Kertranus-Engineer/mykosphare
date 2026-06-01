import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { TelemetryRow } from "@/lib/services/telemetry-service"

export interface CorrelatedCapture {
  capture: ProcessedCapture
  telemetry: TelemetryRow | null
  correlationScore: number
  timeOffsetSeconds: number
}

const MAX_OFFSET_SECONDS = 300
const LOOK_WINDOW_MS = 600_000

export function correlateCapture(
  capture: ProcessedCapture,
  telemetryEntries: TelemetryRow[],
): CorrelatedCapture {
  if (telemetryEntries.length === 0) {
    return {
      capture,
      telemetry: null,
      correlationScore: 0,
      timeOffsetSeconds: 0,
    }
  }

  const captureTime = new Date(capture.uploadedAt).getTime()

  let bestEntry: TelemetryRow | null = null
  let bestOffset = Number.POSITIVE_INFINITY

  for (const entry of telemetryEntries) {
    const entryTime = new Date(entry.created_at).getTime()
    const offset = Math.abs(captureTime - entryTime)

    if (offset < bestOffset) {
      bestOffset = offset
      bestEntry = entry
    }
  }

  const offsetSeconds = Math.round(bestOffset / 1000)

  if (offsetSeconds > MAX_OFFSET_SECONDS) {
    return {
      capture,
      telemetry: null,
      correlationScore: 0,
      timeOffsetSeconds: offsetSeconds,
    }
  }

  const score = Math.max(
    0,
    Math.round(100 - (offsetSeconds / MAX_OFFSET_SECONDS) * 100),
  )

  return {
    capture,
    telemetry: bestEntry,
    correlationScore: score,
    timeOffsetSeconds: offsetSeconds,
  }
}

export function correlateBatch(
  captures: ProcessedCapture[],
  telemetryEntries: TelemetryRow[],
): CorrelatedCapture[] {
  if (telemetryEntries.length === 0) {
    return captures.map((capture) => ({
      capture,
      telemetry: null,
      correlationScore: 0,
      timeOffsetSeconds: 0,
    }))
  }

  return captures.map((capture) => {
    const captureTime = new Date(capture.uploadedAt).getTime()
    const windowStart = captureTime - LOOK_WINDOW_MS
    const windowEnd = captureTime + LOOK_WINDOW_MS

    const windowed = telemetryEntries.filter((entry) => {
      const entryTime = new Date(entry.created_at).getTime()
      return entryTime >= windowStart && entryTime <= windowEnd
    })

    return correlateCapture(capture, windowed.length > 0 ? windowed : telemetryEntries)
  })
}

export function computeBatchStats(results: CorrelatedCapture[]): {
  total: number
  correlated: number
  unmatched: number
  avgScore: number
  avgOffset: number
} {
  if (results.length === 0) {
    return { total: 0, correlated: 0, unmatched: 0, avgScore: 0, avgOffset: 0 }
  }

  const correlated = results.filter((r) => r.telemetry !== null)
  const unmatched = results.length - correlated.length

  const avgScore =
    correlated.length > 0
      ? Math.round(correlated.reduce((sum, r) => sum + r.correlationScore, 0) / correlated.length)
      : 0

  const avgOffset =
    correlated.length > 0
      ? Math.round(correlated.reduce((sum, r) => sum + r.timeOffsetSeconds, 0) / correlated.length)
      : 0

  return {
    total: results.length,
    correlated: correlated.length,
    unmatched,
    avgScore,
    avgOffset,
  }
}
