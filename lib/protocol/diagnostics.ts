import type { TelemetryPayload, DeviceHeartbeatPayload, IngestionResult } from "@/lib/ingestion"
import { PROTOCOL } from "./specification"

interface DuplicateKey {
  deviceId: string
  hash: string
}

const duplicateWindow = new Map<string, number>()
const floodCounters = new Map<string, { count: number; windowStart: number }>()

function computePayloadHash(payload: TelemetryPayload | DeviceHeartbeatPayload): string {
  const m = "metrics" in payload ? payload.metrics : {}
  const relevant =
    "metrics" in payload
      ? `${payload.deviceId}|${JSON.stringify(m)}`
      : `${payload.deviceId}|${payload.status}|${payload.health}`
  return relevant
}

function makeDuplicateKey(
  payload: TelemetryPayload | DeviceHeartbeatPayload
): string {
  return `${computePayloadHash(payload)}|${payload.timestamp}`
}

export function checkDuplicate(
  payload: TelemetryPayload | DeviceHeartbeatPayload
): boolean {
  const key = makeDuplicateKey(payload)
  const now = Date.now()

  for (const [existingKey, timestamp] of duplicateWindow) {
    if (now - timestamp > PROTOCOL.DUPLICATE_WINDOW_MS) {
      duplicateWindow.delete(existingKey)
    }
  }

  if (duplicateWindow.has(key)) {
    return true
  }

  duplicateWindow.set(key, now)
  return false
}

export function getDuplicateCount(): number {
  return duplicateWindow.size
}

export function checkFloodProtection(source: string): boolean {
  const now = Date.now()
  let counter = floodCounters.get(source)

  if (!counter || now - counter.windowStart > PROTOCOL.FLOOD_WINDOW_MS) {
    counter = { count: 0, windowStart: now }
    floodCounters.set(source, counter)
  }

  counter.count++
  return counter.count > PROTOCOL.FLOOD_MAX_PACKETS
}

export function resetFloodCounter(source: string): void {
  floodCounters.delete(source)
}

export function getFloodCounters(): number {
  return floodCounters.size
}

export function runIngestionDiagnostics(
  payload: unknown,
  source: string
): { skip: boolean; reason?: string } {
  if (checkFloodProtection(source)) {
    return {
      skip: true,
      reason: `flood protection: too many packets from ${source}`,
    }
  }

  return { skip: false }
}
