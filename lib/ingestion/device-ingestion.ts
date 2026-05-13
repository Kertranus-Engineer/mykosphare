import type { DeviceHeartbeatPayload, IngestionResult } from "./schemas"
import { validateDeviceHeartbeat } from "./validation"
import { logIngestionEvent } from "./ingestion-logger"
import { upsertDeviceBatch } from "@/lib/services/devices-service"
import { checkDuplicate, checkFloodProtection, recordPacket } from "@/lib/protocol"

export async function ingestDeviceHeartbeat(
  payload: unknown
): Promise<IngestionResult> {
  const rawSource = (payload as Record<string, unknown>)?.source as string || "unknown"

  if (checkFloodProtection(rawSource)) {
    logIngestionEvent({
      eventType: "malformed_payload_rejected",
      source: rawSource,
      accepted: false,
      reason: "flood protection triggered",
    })
    return {
      accepted: false,
      eventType: "malformed_payload_rejected",
      reason: "flood protection triggered",
    }
  }

  const { valid, data, errors, normalized } =
    validateDeviceHeartbeat(payload)

  if (!valid) {
    logIngestionEvent({
      eventType: "malformed_payload_rejected",
      source: rawSource,
      accepted: false,
      reason: errors.join("; "),
    })
    return {
      accepted: false,
      eventType: "malformed_payload_rejected",
      reason: errors.join("; "),
    }
  }

  if (checkDuplicate(data!)) {
    logIngestionEvent({
      eventType: "malformed_payload_rejected",
      source: data!.source,
      accepted: false,
      reason: "duplicate packet rejected",
    })
    return {
      accepted: false,
      eventType: "malformed_payload_rejected",
      reason: "duplicate packet rejected",
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

  const now = new Date().toISOString()
  const latencyMs = Date.now() - new Date(data!.timestamp).getTime()
  recordPacket({
    receivedAt: now,
    source: data!.source,
    deviceId: data!.deviceId,
    payloadTimestamp: data!.timestamp,
    ingestionLatencyMs: latencyMs,
    type: "heartbeat",
    accepted: success,
  })

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
