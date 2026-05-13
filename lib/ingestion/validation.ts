import type {
  TelemetryPayload,
  DeviceHeartbeatPayload,
  EnvironmentalEventPayload,
  IngestionSource,
} from "./schemas"

const STALE_THRESHOLD_MS = 300_000

export function normalizeTimestamp(
  raw: string | number | Date | null | undefined
): { timestamp: string; isStale: boolean } {
  if (!raw) {
    const now = new Date().toISOString()
    return { timestamp: now, isStale: false }
  }

  let date: Date
  try {
    if (raw instanceof Date) {
      date = raw
    } else if (typeof raw === "number") {
      date = new Date(raw)
    } else {
      date = new Date(raw)
    }
  } catch {
    return { timestamp: new Date().toISOString(), isStale: false }
  }

  if (isNaN(date.getTime())) {
    return { timestamp: new Date().toISOString(), isStale: false }
  }

  const timestamp = date.toISOString()
  const age = Date.now() - date.getTime()
  return { timestamp, isStale: age > STALE_THRESHOLD_MS }
}

export function safeNumber(val: unknown, fallback: number): number {
  if (typeof val === "number" && !isNaN(val)) return val
  if (typeof val === "string") {
    const parsed = Number(val)
    if (!isNaN(parsed)) return parsed
  }
  return fallback
}

export function sanitizeString(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.trim().length > 0) return val.trim()
  return fallback
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const VALID_SOURCES: IngestionSource[] = [
  "simulator",
  "esp32",
  "mqtt",
  "api",
]

function normalizeSource(raw: unknown): IngestionSource {
  if (
    typeof raw === "string" &&
    VALID_SOURCES.includes(raw as IngestionSource)
  ) {
    return raw as IngestionSource
  }
  return "simulator"
}

function normalizeMetrics(raw: unknown): TelemetryPayload["metrics"] {
  if (!isRecord(raw)) return {}

  return {
    temperature:
      raw.temperature !== undefined
        ? safeNumber(raw.temperature, undefined as unknown as number)
        : undefined,
    humidity:
      raw.humidity !== undefined
        ? safeNumber(raw.humidity, undefined as unknown as number)
        : undefined,
    co2:
      raw.co2 !== undefined
        ? safeNumber(raw.co2, undefined as unknown as number)
        : undefined,
    energyUsage:
      raw.energyUsage !== undefined
        ? safeNumber(raw.energyUsage, undefined as unknown as number)
        : undefined,
  }
}

export function validateTelemetryPayload(
  payload: unknown
): {
  valid: boolean
  data?: TelemetryPayload
  errors: string[]
  normalized: boolean
} {
  const errors: string[] = []
  let normalized = false

  if (!isRecord(payload)) {
    return { valid: false, errors: ["payload must be a non-null object"], normalized: false }
  }

  if (payload.version !== 1) {
    errors.push(`unsupported payload version: ${payload.version}`)
    return { valid: false, errors, normalized: false }
  }

  const { timestamp, isStale } = normalizeTimestamp(payload.timestamp as string | number | Date | null | undefined)
  if (isStale) {
    return {
      valid: false,
      errors: ["stale timestamp ignored"],
      normalized: false,
    }
  }

  if (payload.timestamp !== timestamp) normalized = true

  const deploymentId =
    payload.deploymentId !== undefined
      ? sanitizeString(payload.deploymentId, "MYK-CH-001")
      : "MYK-CH-001"
  if (payload.deploymentId !== deploymentId) normalized = true

  const deviceId = sanitizeString(payload.deviceId, "unknown")
  if (payload.deviceId !== deviceId) normalized = true

  const source = normalizeSource(payload.source)
  if (payload.source !== source) normalized = true

  const metrics = normalizeMetrics(payload.metrics)
  if (!metrics.temperature && !metrics.humidity && !metrics.co2 && !metrics.energyUsage) {
    errors.push("at least one metric must be provided")
  }

  const environmentalState = sanitizeString(payload.environmentalState, "STABLE")
  if (
    payload.environmentalState !== undefined &&
    payload.environmentalState !== environmentalState
  )
    normalized = true

  const operationalMode = sanitizeString(payload.operationalMode, "OPERATIONAL")
  if (
    payload.operationalMode !== undefined &&
    payload.operationalMode !== operationalMode
  )
    normalized = true

  if (errors.length > 0) {
    return { valid: false, errors, normalized }
  }

  return {
    valid: true,
    data: {
      version: 1,
      source,
      timestamp,
      deviceId,
      deploymentId,
      metrics,
      environmentalState,
      operationalMode,
    },
    errors: [],
    normalized,
  }
}

export function validateDeviceHeartbeat(
  payload: unknown
): {
  valid: boolean
  data?: DeviceHeartbeatPayload
  errors: string[]
  normalized: boolean
} {
  const errors: string[] = []
  let normalized = false

  if (!isRecord(payload)) {
    return { valid: false, errors: ["payload must be a non-null object"], normalized: false }
  }

  if (payload.version !== 1) {
    errors.push(`unsupported payload version: ${payload.version}`)
    return { valid: false, errors, normalized: false }
  }

  const { timestamp, isStale } = normalizeTimestamp(payload.timestamp as string | number | Date | null | undefined)
  if (isStale) {
    return {
      valid: false,
      errors: ["stale timestamp ignored"],
      normalized: false,
    }
  }
  if (payload.timestamp !== timestamp) normalized = true

  const deviceId = sanitizeString(payload.deviceId, "")
  if (!deviceId) {
    errors.push("deviceId is required")
  }

  const deviceType = sanitizeString(
    payload.deviceType,
    "unknown"
  )
  if (payload.deviceType !== deviceType) normalized = true

  const status = sanitizeString(payload.status, "online")
  if (payload.status !== status) normalized = true

  const health = safeNumber(payload.health, 100)
  if (payload.health !== health) normalized = true

  const uptime = safeNumber(payload.uptime, 0)
  if (payload.uptime !== uptime) normalized = true

  const deploymentId =
    payload.deploymentId !== undefined
      ? sanitizeString(payload.deploymentId, "MYK-CH-001")
      : "MYK-CH-001"
  if (payload.deploymentId !== deploymentId) normalized = true

  const source = normalizeSource(payload.source)
  if (payload.source !== source) normalized = true

  if (errors.length > 0) {
    return { valid: false, errors, normalized }
  }

  return {
    valid: true,
    data: {
      version: 1,
      source,
      timestamp,
      deviceId,
      deviceType,
      status,
      health,
      uptime,
      deploymentId,
    },
    errors: [],
    normalized,
  }
}

export function validateEnvironmentalEvent(
  payload: unknown
): {
  valid: boolean
  data?: EnvironmentalEventPayload
  errors: string[]
  normalized: boolean
} {
  const errors: string[] = []
  let normalized = false

  if (!isRecord(payload)) {
    return { valid: false, errors: ["payload must be a non-null object"], normalized: false }
  }

  if (payload.version !== 1) {
    errors.push(`unsupported payload version: ${payload.version}`)
    return { valid: false, errors, normalized: false }
  }

  const { timestamp, isStale } = normalizeTimestamp(payload.timestamp as string | number | Date | null | undefined)
  if (isStale) {
    return {
      valid: false,
      errors: ["stale timestamp ignored"],
      normalized: false,
    }
  }
  if (payload.timestamp !== timestamp) normalized = true

  const eventType = sanitizeString(payload.type, "state_change")
  if (
    !["state_change", "threshold_breach", "alert"].includes(eventType)
  ) {
    errors.push(`invalid event type: ${eventType}`)
  }
  if (payload.type !== eventType) normalized = true

  const deploymentId =
    payload.deploymentId !== undefined
      ? sanitizeString(payload.deploymentId, "MYK-CH-001")
      : "MYK-CH-001"
  if (payload.deploymentId !== deploymentId) normalized = true

  const currentState = sanitizeString(payload.currentState, "STABLE")
  if (!currentState) {
    errors.push("currentState is required")
  }
  if (payload.currentState !== currentState) normalized = true

  const previousState = payload.previousState
    ? sanitizeString(payload.previousState, "")
    : undefined
  if (
    payload.previousState !== undefined &&
    payload.previousState !== previousState
  )
    normalized = true

  const severity = ["info", "warning", "critical"].includes(
    sanitizeString(payload.severity, "info")
  )
    ? sanitizeString(payload.severity, "info")
    : "info"
  if (payload.severity !== severity) normalized = true

  const source = normalizeSource(payload.source)
  if (payload.source !== source) normalized = true

  if (errors.length > 0) {
    return { valid: false, errors, normalized }
  }

  return {
    valid: true,
    data: {
      version: 1,
      source,
      timestamp,
      type: eventType as "state_change" | "threshold_breach" | "alert",
      deploymentId,
      currentState,
      previousState,
      severity: severity as "info" | "warning" | "critical",
      description: sanitizeString(payload.description, undefined as unknown as string) || undefined,
      metrics: payload.metrics && isRecord(payload.metrics) ? normalizeMetrics(payload.metrics) as EnvironmentalEventPayload["metrics"] : undefined,
    },
    errors: [],
    normalized,
  }
}
