import type { IngestionSource, IngestionEventType } from "./schemas"

interface SourceMetrics {
  accepted: number
  rejected: number
  lastAcceptedTimestamp: string | null
  lastRejectedTimestamp: string | null
}

interface IngestionMetricsSnapshot {
  totalAccepted: number
  totalRejected: number
  malformedPayloads: number
  staleTimestamps: number
  rateLimitHits: number
  authFailures: number
  lastIngestionTimestamp: string | null
  perSource: Record<string, SourceMetrics>
}

const metrics: IngestionMetricsSnapshot = {
  totalAccepted: 0,
  totalRejected: 0,
  malformedPayloads: 0,
  staleTimestamps: 0,
  rateLimitHits: 0,
  authFailures: 0,
  lastIngestionTimestamp: null,
  perSource: {},
}

function ensureSource(source: string): SourceMetrics {
  if (!metrics.perSource[source]) {
    metrics.perSource[source] = {
      accepted: 0,
      rejected: 0,
      lastAcceptedTimestamp: null,
      lastRejectedTimestamp: null,
    }
  }
  return metrics.perSource[source]
}

export function recordAccepted(source: string): void {
  metrics.totalAccepted++
  metrics.lastIngestionTimestamp = new Date().toISOString()
  const s = ensureSource(source)
  s.accepted++
  s.lastAcceptedTimestamp = new Date().toISOString()
}

export function recordRejected(
  source: string,
  reason: IngestionEventType | "auth_failed" | "rate_limited"
): void {
  metrics.totalRejected++
  const s = ensureSource(source)
  s.rejected++
  s.lastRejectedTimestamp = new Date().toISOString()

  if (reason === "malformed_payload_rejected") metrics.malformedPayloads++
  if (reason === "stale_timestamp_ignored") metrics.staleTimestamps++
  if (reason === "rate_limited") metrics.rateLimitHits++
  if (reason === "auth_failed") metrics.authFailures++
}

export function getIngestionMetrics(): IngestionMetricsSnapshot {
  return { ...metrics, perSource: { ...metrics.perSource } }
}

export function resetIngestionMetrics(): void {
  metrics.totalAccepted = 0
  metrics.totalRejected = 0
  metrics.malformedPayloads = 0
  metrics.staleTimestamps = 0
  metrics.rateLimitHits = 0
  metrics.authFailures = 0
  metrics.lastIngestionTimestamp = null
  metrics.perSource = {}
}
