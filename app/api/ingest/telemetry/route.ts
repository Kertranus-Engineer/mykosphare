import { NextResponse } from "next/server"
import { ingestTelemetry } from "@/lib/ingestion"
import { validateTelemetryPayload } from "@/lib/ingestion"
import { handlePreflight, authenticate, applyRateLimit, recordSuccess, recordRejected, respond } from "@/lib/ingestion/api-shared"

export async function OPTIONS(): Promise<NextResponse> {
  return handlePreflight()
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = authenticate(request)
  if (authError) return respond(401, authError)

  const source = request.headers.get("x-ingestion-key") ?? "unknown"
  const rateLimitError = applyRateLimit(source)
  if (rateLimitError) return respond(429, rateLimitError)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    recordRejected(source, "malformed_payload_rejected")
    return respond(400, {
      accepted: false,
      eventType: "malformed_payload_rejected",
      reason: "invalid JSON body",
      timestamp: new Date().toISOString(),
    })
  }

  const validation = validateTelemetryPayload(body)
  if (!validation.valid) {
    const reason = validation.errors.join("; ")
    recordRejected(source, validation.errors.some((e) => e.includes("stale")) ? "stale_timestamp_ignored" : "malformed_payload_rejected")
    return respond(400, {
      accepted: false,
      eventType: "malformed_payload_rejected",
      reason,
      timestamp: new Date().toISOString(),
    })
  }

  const result = await ingestTelemetry(validation.data!)
  recordSuccess(source, validation.normalized)

  return respond(200, {
    accepted: result.accepted,
    eventType: result.eventType,
    normalized: validation.normalized || undefined,
    timestamp: new Date().toISOString(),
  })
}
