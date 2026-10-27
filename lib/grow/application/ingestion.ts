import { deviceKeyMatches } from "./device-auth"
import type { DeviceReadingInput } from "./validation"

/**
 * Device ingestion (server-only). Pure logic over an `IngestionStore` so it is
 * testable without Next.js or Supabase.
 *
 *   x-device-id (hardware identifier) + x-device-key
 *     → device exists, enabled, key matches an ACTIVE credential
 *     → chamber resolved FROM THE DEVICE RECORD (never from the request)
 *     → reading persisted with origin `real`, attached to the active run if any
 *
 * Unknown device and wrong key are indistinguishable to the caller (401) to
 * avoid device enumeration; a disabled device is 403.
 */
export interface IngestionDevice {
  id: string
  chamberId: string
  enabled: boolean
}

export interface IngestionStore {
  findDeviceByHardwareId(hardwareId: string): Promise<IngestionDevice | null>
  getActiveCredentialHashes(deviceId: string): Promise<string[]>
  consumeRateLimit(bucket: string, limit: number): Promise<boolean>
  recordReading(row: {
    deviceId: string
    observedAt: string
    temperature: number | null
    humidity: number | null
    clock: "device" | "server"
  }): Promise<{ inserted: boolean; runAttached: boolean }>
}

export type DeviceAuthResult = { status: "authenticated"; device: IngestionDevice } | { status: "unauthorized" } | { status: "disabled" }

export async function authenticateDevice(store: IngestionStore, hardwareId: string | null, key: string | null): Promise<DeviceAuthResult> {
  if (!hardwareId || !key || hardwareId.length > 128 || key.length > 256) return { status: "unauthorized" }
  const device = await store.findDeviceByHardwareId(hardwareId)
  if (!device) return { status: "unauthorized" }
  const hashes = await store.getActiveCredentialHashes(device.id)
  if (!deviceKeyMatches(key, hashes)) return { status: "unauthorized" }
  if (!device.enabled) return { status: "disabled" }
  return { status: "authenticated", device }
}

export type DeviceIngestionResult = { status: "accepted" | "duplicate"; runAttached: boolean; observedAt: string }

export async function ingestDeviceReading(input: {
  store: IngestionStore
  device: IngestionDevice
  reading: DeviceReadingInput
  receivedAt: string
}): Promise<DeviceIngestionResult> {
  const { store, device, reading } = input
  const observedAt = reading.observedAt ?? input.receivedAt
  const outcome = await store.recordReading({
    deviceId: device.id,
    observedAt,
    temperature: reading.temperature ?? null,
    humidity: reading.humidity ?? null,
    clock: reading.observedAt ? "device" : "server",
  })
  return { status: outcome.inserted ? "accepted" : "duplicate", runAttached: outcome.runAttached, observedAt }
}
