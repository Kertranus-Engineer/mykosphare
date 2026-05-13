import type { TelemetryPayload, IngestionResult } from "./schemas"
import { validateTelemetryPayload } from "./validation"
import { logIngestionEvent } from "./ingestion-logger"
import { insertTelemetry } from "@/lib/services/telemetry-service"
import { checkDuplicate, checkFloodProtection, recordPacket } from "@/lib/protocol"

export async function ingestTelemetry(
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
    validateTelemetryPayload(payload)

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

  if (data!.environmentalState) {
    const envPayload = {
      version: 1 as const,
      source: data!.source,
      timestamp: data!.timestamp,
      type: "state_change" as const,
      deploymentId: data!.deploymentId,
      currentState: data!.environmentalState,
      severity: "info" as const,
      metrics: data!.metrics,
    }
    const { ingestEnvironmentalEvent } = await import("./alert-ingestion")
    await ingestEnvironmentalEvent(envPayload)
  }

  const success = await insertTelemetry(
    data!.metrics.temperature ?? 0,
    data!.metrics.humidity ?? 0,
    data!.metrics.co2 ?? 0,
    data!.metrics.energyUsage ?? 0,
    data!.environmentalState ?? "STABLE",
    data!.operationalMode ?? "OPERATIONAL"
  )

  const now = new Date().toISOString()
  const latencyMs = Date.now() - new Date(data!.timestamp).getTime()
  recordPacket({
    receivedAt: now,
    source: data!.source,
    deviceId: data!.deviceId,
    payloadTimestamp: data!.timestamp,
    ingestionLatencyMs: latencyMs,
    type: "telemetry",
    accepted: success,
  })

  logIngestionEvent({
    eventType: "telemetry_accepted",
    source: data!.source,
    accepted: true,
    normalized: normalized || undefined,
  })

  return {
    accepted: true,
    eventType: "telemetry_accepted",
    normalized: normalized || undefined,
  }
}
