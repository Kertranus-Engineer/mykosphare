import { authenticateDevice, type IngestionStore } from "../application/ingestion"
import { readReadingBody } from "../application/reading-handler"
import { MAX_SYNC_BYTES, parseDeviceReport, parseOwnerConfig } from "./validation"
import type { Capabilities, ControlMode, ControlTargets, DesiredConfig, DeviceReport } from "./types"

/** Device side: report in, newest desired config out. Reuses the per-device credential of the readings endpoint. */
export interface SyncStore extends IngestionStore {
  getLatestConfig(deviceId: string): Promise<DesiredConfig | null>
  recordReport(input: { deviceId: string; report: DeviceReport; receivedAt: string }): Promise<void>
}

const reply = (status: number, error: string) => Response.json({ error }, {
  status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
})

export function createDeviceSyncHandler(deps: { store: () => SyncStore; allow: (key: string, limit: number) => boolean; now?: () => Date }) {
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
      // Syncs have their own budget so they can never starve the readings of the same device.
      if (!deps.allow(`sync:${auth.device.id}`, 6)) return reply(429, "too many requests")
      if (!await store.consumeRateLimit(`sync:${auth.device.id}`, 6)) return reply(429, "too many requests")
      const body = await readReadingBody(request, MAX_SYNC_BYTES)
      if (body instanceof Response) return body
      const parsed = parseDeviceReport(body, receivedAt)
      if (!parsed.ok) return reply(400, parsed.error)
      await store.recordReport({ deviceId: auth.device.id, report: parsed.value, receivedAt: receivedAt.toISOString() })
      const latest = await store.getLatestConfig(auth.device.id)
      // Only send the config when the device does not have it yet: the common poll costs a few bytes.
      const needed = latest !== null && latest.version !== parsed.value.receivedVersion
      return Response.json({ desiredVersion: latest?.version ?? null, config: needed ? latest : null, serverTime: receivedAt.toISOString() }, { headers: { "Cache-Control": "no-store" } })
    } catch { return reply(503, "sync unavailable") }
  }
}

/** Owner side: publish a new desired config after the person confirmed the exact values. */
export interface PublishStore {
  findDeviceForOwner(ownerId: string): Promise<{ id: string; enabled: boolean } | null>
  publishConfig(input: { deviceId: string; mode: ControlMode; targets: ControlTargets; capabilities: Capabilities; note: string | null; createdBy: string }): Promise<number>
}

export type PublishResult =
  | { status: 201; version: number }
  | { status: 400 | 404 | 409 | 503; error: string }

export async function publishOwnerConfig(input: { store: PublishStore; ownerId: string; body: unknown }): Promise<PublishResult> {
  const parsed = parseOwnerConfig(input.body)
  if (!parsed.ok) return { status: parsed.error === "actuation_not_enabled" ? 409 : 400, error: parsed.error }
  try {
    const device = await input.store.findDeviceForOwner(input.ownerId)
    if (!device) return { status: 404, error: "no device registered for this account" }
    if (!device.enabled) return { status: 409, error: "device disabled" }
    const version = await input.store.publishConfig({ deviceId: device.id, ...parsed.value, createdBy: input.ownerId })
    return { status: 201, version }
  } catch { return { status: 503, error: "unavailable" } }
}
