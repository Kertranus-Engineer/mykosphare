import type { EnvironmentalEventPayload, IngestionResult } from "./schemas"
import { validateEnvironmentalEvent } from "./validation"
import { logIngestionEvent } from "./ingestion-logger"

export async function ingestEnvironmentalEvent(
  payload: unknown
): Promise<IngestionResult> {
  const { valid, data, errors, normalized } =
    validateEnvironmentalEvent(payload)

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

  const description =
    data!.description ??
    `Environmental ${data!.type}: ${data!.currentState}` +
      (data!.previousState
        ? ` (was ${data!.previousState})`
        : "")

  const { insertLog } = await import("@/lib/services/logs-service")
  const success = await insertLog(description, "environment")

  logIngestionEvent({
    eventType: "environmental_event_created",
    source: data!.source,
    accepted: success,
    normalized: normalized || undefined,
    reason: description,
  })

  return {
    accepted: success,
    eventType: "environmental_event_created",
    normalized: normalized || undefined,
  }
}
