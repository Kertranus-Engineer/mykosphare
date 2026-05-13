export { ingestTelemetry } from "./telemetry-ingestion"
export {
  ingestDeviceHeartbeat,
  ingestDeviceHeartbeatBatch,
} from "./device-ingestion"
export { ingestEnvironmentalEvent } from "./alert-ingestion"
export { logIngestionEvent, getIngestionLogs, clearIngestionLogs } from "./ingestion-logger"
export type { IngestionLogEntry } from "./ingestion-logger"
export type {
  TelemetryPayload,
  DeviceHeartbeatPayload,
  EnvironmentalEventPayload,
  IngestionSource,
  IngestionResult,
  IngestionEventType,
} from "./schemas"
export {
  validateTelemetryPayload,
  validateDeviceHeartbeat,
  validateEnvironmentalEvent,
  normalizeTimestamp,
  safeNumber,
  sanitizeString,
} from "./validation"
export { verifyIngestionKey } from "./auth"
export type { AuthResult } from "./auth"
export { checkRateLimit, getRateLimitStoreSize } from "./rate-limit"
export type { RateLimitResult } from "./rate-limit"
export {
  recordAccepted,
  recordRejected,
  getIngestionMetrics,
  resetIngestionMetrics,
} from "./metrics"
