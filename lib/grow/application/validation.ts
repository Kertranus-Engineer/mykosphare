/**
 * v2 device reading contract (body). Identity comes from the authenticated
 * headers (`x-device-id`, `x-device-key`), never from the body. `deviceId` is
 * still accepted in the body for compatibility but must equal the header.
 *
 *   { "observedAt"?: ISO-8601, "temperature"?: number °C, "humidity"?: number % }
 *
 * `observedAt` is optional because an ESP32 without NTP has no wall clock; the
 * server then stamps the receipt time and records `clock: "server"` in the
 * reading metadata, so the provenance of the timestamp itself is explicit.
 */
export interface DeviceReadingInput {
  deviceId?: string
  observedAt?: string
  temperature?: number
  humidity?: number
}

export type DeviceReadingValidation = { ok: true; data: DeviceReadingInput } | { ok: false; error: string }

const ALLOWED = ["deviceId", "observedAt", "temperature", "humidity"]
const MAX_FUTURE_MS = 5 * 60 * 1000
const MAX_PAST_MS = 7 * 24 * 60 * 60 * 1000

export function validateDeviceReadingPayload(value: unknown, now: string | Date = new Date()): DeviceReadingValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "body must be an object" }
  const body = value as Record<string, unknown>
  const unsupported = Object.keys(body).find((key) => !ALLOWED.includes(key))
  if (unsupported) return { ok: false, error: `unsupported field: ${unsupported}` }

  if (body.deviceId !== undefined && (typeof body.deviceId !== "string" || body.deviceId.trim().length === 0 || body.deviceId.length > 128)) {
    return { ok: false, error: "deviceId must be a non-empty string" }
  }

  let observedAt: string | undefined
  if (body.observedAt !== undefined) {
    if (typeof body.observedAt !== "string") return { ok: false, error: "observedAt must be a valid timestamp" }
    const observed = new Date(body.observedAt).getTime()
    const received = new Date(now).getTime()
    if (!Number.isFinite(observed)) return { ok: false, error: "observedAt must be a valid timestamp" }
    if (!Number.isFinite(received) || observed > received + MAX_FUTURE_MS) return { ok: false, error: "observedAt cannot be too far in the future" }
    if (observed < received - MAX_PAST_MS) return { ok: false, error: "observedAt is too old" }
    observedAt = body.observedAt
  }

  const temperature = body.temperature
  const humidity = body.humidity
  if (temperature === undefined && humidity === undefined) return { ok: false, error: "at least one measured metric is required" }
  if (temperature !== undefined && (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < -50 || temperature > 100)) return { ok: false, error: "temperature is outside transport bounds" }
  if (humidity !== undefined && (typeof humidity !== "number" || !Number.isFinite(humidity) || humidity < 0 || humidity > 100)) return { ok: false, error: "humidity is outside transport bounds" }

  return {
    ok: true,
    data: {
      ...(typeof body.deviceId === "string" ? { deviceId: body.deviceId.trim() } : {}),
      ...(observedAt ? { observedAt } : {}),
      ...(temperature !== undefined ? { temperature: temperature as number } : {}),
      ...(humidity !== undefined ? { humidity: humidity as number } : {}),
    },
  }
}
