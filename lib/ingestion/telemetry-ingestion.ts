import type { TelemetryPayload, IngestionResult } from "./schemas"
import { validateTelemetryPayload } from "./validation"
import { logIngestionEvent } from "./ingestion-logger"
import { insertTelemetry } from "@/lib/services/telemetry-service"

export async function ingestTelemetry(
  payload: unknown
): Promise<IngestionResult> {
  const { valid, data, errors, normalized } =
    validateTelemetryPayload(payload)

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
