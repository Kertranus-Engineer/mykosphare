import type { DataOrigin, EnvironmentalReading } from "../types"

/** Deliberately narrow shape of the legacy GET /api/data response. */
export interface LegacyApiDataPayload {
  [key: string]: unknown
  temp?: unknown
  hum?: unknown
  serverReceivedAt?: unknown
  source?: unknown
  deviceId?: unknown
}

export interface Esp32TelemetryPayload {
  [key: string]: unknown
  temp?: unknown
  hum?: unknown
  timestamp?: unknown
  deviceId?: unknown
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function createReading(input: {
  temperature?: number
  humidity?: number
  timestamp?: string
  origin: DataOrigin
  source: string
  deviceId?: string
}): EnvironmentalReading | null {
  if (!input.timestamp || !Number.isFinite(new Date(input.timestamp).getTime())) return null
  if (input.temperature === undefined && input.humidity === undefined) return null
  return {
    ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    ...(input.humidity !== undefined ? { humidity: input.humidity } : {}),
    timestamp: input.timestamp,
    origin: input.origin,
    source: input.source,
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
  }
}

/** Converts direct ESP32 data; fan/humidifier and unknown fields are intentionally ignored. */
export function adaptEsp32Telemetry(payload: Esp32TelemetryPayload): EnvironmentalReading | null {
  return createReading({
    temperature: finiteNumber(payload.temp),
    humidity: finiteNumber(payload.hum),
    timestamp: nonEmptyString(payload.timestamp),
    origin: "real",
    source: "esp32",
    deviceId: nonEmptyString(payload.deviceId),
  })
}

/** Bridges the existing API response without importing the route or its server store. */
export function adaptLegacyApiData(payload: LegacyApiDataPayload): EnvironmentalReading | null {
  if (payload.source !== "live") return null
  return createReading({
    temperature: finiteNumber(payload.temp),
    humidity: finiteNumber(payload.hum),
    timestamp: nonEmptyString(payload.serverReceivedAt),
    origin: "real",
    source: "legacy-api-data",
    deviceId: nonEmptyString(payload.deviceId),
  })
}

/** Ensures simulation must explicitly declare its simulated provenance. */
export function adaptSimulatedTelemetry(reading: Omit<EnvironmentalReading, "origin" | "source"> & { source?: string }): EnvironmentalReading {
  return {
    ...reading,
    origin: "simulated",
    source: reading.source ?? "grow-simulator",
  }
}
