export const PROTOCOL = {
  TELEMETRY_CADENCE_MS: 2500,
  TELEMETRY_CADENCE_DESC: "2.5s between consecutive telemetry readings per device",
  HEARTBEAT_CADENCE_MS: 60_000,
  HEARTBEAT_CADENCE_DESC: "60s between device heartbeat reports",
  MAX_RETRIES: 3,
  MAX_RETRIES_DESC: "Max HTTP retry attempts before backing off",
  BASE_RETRY_DELAY_MS: 1000,
  BASE_RETRY_DELAY_DESC: "Initial retry delay (exponential backoff)",
  MAX_RETRY_DELAY_MS: 30_000,
  MAX_RETRY_DELAY_DESC: "Ceiling for exponential backoff",
  RECONNECT_BASE_DELAY_MS: 5000,
  RECONNECT_BASE_DELAY_DESC: "Initial delay before reconnect attempt",
  RECONNECT_MAX_DELAY_MS: 120_000,
  RECONNECT_MAX_DELAY_DESC: "Maximum delay between reconnect attempts (2 min)",
  RECONNECT_JITTER_FACTOR: 0.3,
  RECONNECT_JITTER_DESC: "Random jitter applied to reconnect delays (±30%)",
  OFFLINE_BUFFER_MAX: 500,
  OFFLINE_BUFFER_MAX_DESC: "Maximum telemetry packets buffered during offline periods (FIFO)",
  BATCH_MAX_SIZE: 10,
  BATCH_MAX_SIZE_DESC: "Maximum payloads per HTTP batch request",
  BATCH_FLUSH_INTERVAL_MS: 10_000,
  BATCH_FLUSH_INTERVAL_DESC: "Interval at which offline buffer is flushed (10s)",
  STALE_THRESHOLD_MS: 300_000,
  STALE_THRESHOLD_DESC: "Packets older than this are rejected (5 min)",
  FLOOD_WINDOW_MS: 10_000,
  FLOOD_WINDOW_DESC: "Time window for reconnect flood detection (10s)",
  FLOOD_MAX_PACKETS: 25,
  FLOOD_MAX_PACKETS_DESC: "Max packets allowed in flood window",
  DUPLICATE_WINDOW_MS: 60_000,
  DUPLICATE_WINDOW_DESC: "Time window for duplicate detection (1 min)",
} as const

export function calculateRetryDelay(attempt: number): number {
  const delay = Math.min(
    PROTOCOL.BASE_RETRY_DELAY_MS * Math.pow(2, attempt),
    PROTOCOL.MAX_RETRY_DELAY_MS
  )
  const jitter = delay * (Math.random() * 2 - 1) * PROTOCOL.RECONNECT_JITTER_FACTOR
  return Math.round(delay + jitter)
}

export function calculateReconnectDelay(attempt: number): number {
  const delay = Math.min(
    PROTOCOL.RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt),
    PROTOCOL.RECONNECT_MAX_DELAY_MS
  )
  const jitter = delay * (Math.random() * 2 - 1) * PROTOCOL.RECONNECT_JITTER_FACTOR
  return Math.round(delay + jitter)
}
