import { authenticateDevice, ingestDeviceReading, type IngestionStore } from "./ingestion"
import { validateDeviceReadingPayload } from "./validation"

export const READING_MAX_BYTES = 2048
export const READING_MAX_AGE_MS = 120_000

/** Fast per-process filter for authenticated devices; the database enforces the shared per-device limit. */
export function createReadingLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, { count: number; until: number }>()
  return (key: string, limit: number): boolean => {
    const time = now()
    for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id)
    let bucket = buckets.get(key)
    if (!bucket) {
      if (buckets.size >= 2048) return false
      bucket = { count: 0, until: time + 60_000 }
      buckets.set(key, bucket)
    }
    return ++bucket.count <= limit
  }
}

const reply = (status: number, error: string) => Response.json({ error }, {
  status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
})

/** Enforces a BYTE limit while streaming, even without Content-Length. */
export async function readReadingBody(request: Request): Promise<unknown | Response> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply(415, "application/json required")
  const length = request.headers.get("content-length")
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > READING_MAX_BYTES)) return reply(413, "payload too large")
  if (!request.body) return reply(400, "empty body")
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > READING_MAX_BYTES) { await reader.cancel(); return reply(413, "payload too large") }
      chunks.push(chunk.value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
  } catch { return reply(400, "invalid JSON") }
  finally { reader.releaseLock() }
}

export function createDeviceReadingHandler(deps: {
  store: () => IngestionStore
  allow: (key: string, limit: number) => boolean
  now?: () => Date
}) {
  return async (request: Request): Promise<Response> => {
    const receivedAt = deps.now?.() ?? new Date()
    const hardwareId = request.headers.get("x-device-id")
    const key = request.headers.get("x-device-key")
    if (!hardwareId || !key || hardwareId.length > 128 || key.length > 256) return reply(401, "unauthorized")
    try {
      const store = deps.store()
      const auth = await authenticateDevice(store, hardwareId, key)
      if (auth.status === "unauthorized") return reply(401, "unauthorized")
      if (auth.status === "disabled") return reply(403, "device disabled")
      if (!deps.allow(`device:${auth.device.id}`, 6)) return reply(429, "too many requests")
      if (!await store.consumeRateLimit(`device:${auth.device.id}`, 6)) return reply(429, "too many requests")
      const body = await readReadingBody(request)
      if (body instanceof Response) return body
      const validation = validateDeviceReadingPayload(body, receivedAt)
      if (!validation.ok) return reply(400, validation.error)
      const reading = validation.data
      if (reading.deviceId !== undefined && reading.deviceId !== hardwareId) return reply(400, "deviceId mismatch")
      // Pilot requires sampling time: retries keep the same identity after a lost response.
      if (!reading.observedAt || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(reading.observedAt)) return reply(400, "observedAt must be an ISO UTC sampling time")
      const age = receivedAt.getTime() - Date.parse(reading.observedAt)
      if (age > READING_MAX_AGE_MS || age < -30_000) return reply(400, "sampling time outside pilot window")
      reading.observedAt = new Date(reading.observedAt).toISOString()
      const result = await ingestDeviceReading({ store, device: auth.device, reading, receivedAt: receivedAt.toISOString() })
      return Response.json({ accepted: result.status === "accepted", duplicate: result.status === "duplicate", runAttached: result.runAttached, observedAt: result.observedAt }, {
        status: result.status === "duplicate" ? 200 : 201, headers: { "Cache-Control": "no-store" },
      })
    } catch { return reply(503, "ingestion unavailable") }
  }
}
