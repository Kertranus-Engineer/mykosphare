import { NextResponse } from "next/server"
import {
  validateTelemetryPayload,
  validateDeviceHeartbeat,
  validateEnvironmentalEvent,
} from "@/lib/ingestion"
import { isRecord } from "@/lib/ingestion/validation"

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { valid: false, error: "invalid JSON" },
      { status: 400 }
    )
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { valid: false, error: "payload must be a non-null object" },
      { status: 400 }
    )
  }

  const autoDetect =
    (body as Record<string, unknown>).metrics !== undefined
      ? "telemetry"
      : (body as Record<string, unknown>).deviceType !== undefined
        ? "heartbeat"
        : (body as Record<string, unknown>).type !== undefined
          ? "event"
          : null

  let result:
    | { valid: boolean; data?: unknown; errors: string[]; normalized: boolean }
    | null = null

  if (autoDetect === "telemetry") {
    result = validateTelemetryPayload(body)
  } else if (autoDetect === "heartbeat") {
    result = validateDeviceHeartbeat(body)
  } else if (autoDetect === "event") {
    result = validateEnvironmentalEvent(body)
  }

  if (!result) {
    return NextResponse.json(
      {
        valid: false,
        error:
          "could not auto-detect payload type. Ensure payload has 'metrics' (telemetry), 'deviceType' (heartbeat), or 'type' (event)",
        detectedType: autoDetect,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    valid: result.valid,
    detectedType: autoDetect,
    errors: result.errors,
    normalized: result.normalized,
    data: result.data ?? null,
  })
}
