import type { DeviceHeartbeatPayload, IngestionResult } from "./schemas"
import { validateDeviceHeartbeat } from "./validation"
import { logIngestionEvent } from "./ingestion-logger"
import { upsertDeviceBatch } from "@/lib/services/devices-service"

export async function ingestDeviceHeartbeat(
  payload: unknown
): Promise<IngestionResult> {
  const { valid, data, errors, normalized } =
    validateDeviceHeartbeat(payload)

  if (!valid) {
    logIngestionEvent({
      eventType: "malformed_payload_rejected",
      source: (payload as Record<string, unknown>)?.source as string || "unknown",
      accepted: false,
      reason: errors.join("; "),
    })
    return {
      accepted: false,
      eventType: "malformed_payload_rejected",
      reason: errors.join("; "),
    }
  }

  if (normalized) {
    logIngestionEvent({
      eventType: "normalization_applied",
      source: data!.source,
      accepted: true,
      normalized: true,
    })
  }

  const success = await upsertDeviceBatch([
    {
      device_id: data!.deviceId,
      device_type: data!.deviceType,
      status: data!.status,
      health: data!.health,
      uptime: data!.uptime,
      last_sync: data!.timestamp,
      deployment_id: data!.deploymentId,
    },
  ])

  logIngestionEvent({
    eventType: "device_heartbeat_accepted",
    source: data!.source,
    accepted: success,
    normalized: normalized || undefined,
  })

  return {
    accepted: success,
    eventType: "device_heartbeat_accepted",
    normalized: normalized || undefined,
  }
}

export async function ingestDeviceHeartbeatBatch(
  payloads: unknown[]
): Promise<IngestionResult[]> {
  return Promise.all(payloads.map(ingestDeviceHeartbeat))
}
