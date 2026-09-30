export interface DeviceReadingInput { deviceId: string; observedAt: string; temperature?: number; humidity?: number }
export type DeviceReadingValidation = { ok: true; data: DeviceReadingInput } | { ok: false; error: string }

export function validateDeviceReadingPayload(value: unknown, now: string | Date = new Date()): DeviceReadingValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "body must be an object" }
  const body = value as Record<string, unknown>
  const unsupported = Object.keys(body).find((key) => !["deviceId", "observedAt", "temperature", "humidity"].includes(key))
  if (unsupported) return { ok: false, error: `unsupported field: ${unsupported}` }
  if (typeof body.deviceId !== "string" || body.deviceId.trim().length === 0 || body.deviceId.length > 128) return { ok: false, error: "deviceId is required" }
  const observedAtIso = typeof body.observedAt === "string" ? body.observedAt : null
  const observedAt = observedAtIso ? new Date(observedAtIso).getTime() : Number.NaN
  const receivedAt = new Date(now).getTime()
  if (!Number.isFinite(observedAt)) return { ok: false, error: "observedAt must be a valid timestamp" }
  if (!Number.isFinite(receivedAt) || observedAt > receivedAt + 5 * 60 * 1000) return { ok: false, error: "observedAt cannot be too far in the future" }
  const temperature = body.temperature
  const humidity = body.humidity
  if (temperature === undefined && humidity === undefined) return { ok: false, error: "at least one measured metric is required" }
  if (temperature !== undefined && (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < -50 || temperature > 100)) return { ok: false, error: "temperature is outside transport bounds" }
  if (humidity !== undefined && (typeof humidity !== "number" || !Number.isFinite(humidity) || humidity < 0 || humidity > 100)) return { ok: false, error: "humidity is outside transport bounds" }
  return { ok: true, data: { deviceId: body.deviceId.trim(), observedAt: observedAtIso!, ...(temperature !== undefined ? { temperature: temperature as number } : {}), ...(humidity !== undefined ? { humidity: humidity as number } : {}) } }
}
