import { NextResponse } from "next/server"
import { verifyIngestionKey } from "./auth"
import { checkRateLimit } from "./rate-limit"
import { recordAccepted, recordRejected } from "./metrics"
import { logIngestionEvent } from "./ingestion-logger"

export interface ApiResponseBody {
  accepted: boolean
  eventType: string
  reason?: string
  normalized?: boolean
  retryAfter?: number
  timestamp: string
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-ingestion-key",
  }
}

export function respond(
  status: number,
  body: ApiResponseBody
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(),
  })
}

export function handlePreflight(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export function authenticate(request: Request): ApiResponseBody | null {
  const auth = verifyIngestionKey(request)
  if (!auth.authorized) {
    recordRejected(auth.source, "auth_failed")
    logIngestionEvent({
      eventType: "malformed_payload_rejected",
      source: auth.source,
      accepted: false,
      reason: auth.reason,
    })
    return {
      accepted: false,
      eventType: "auth_failed",
      reason: auth.reason ?? "unauthorized",
      timestamp: new Date().toISOString(),
    }
  }
  return null
}

export function applyRateLimit(
  source: string
): ApiResponseBody | null {
  const rl = checkRateLimit(source)
  if (!rl.allowed) {
    recordRejected(source, "rate_limited")
    logIngestionEvent({
      eventType: "malformed_payload_rejected",
      source,
      accepted: false,
      reason: "rate limit exceeded",
    })
    return {
      accepted: false,
      eventType: "rate_limited",
      reason: "rate limit exceeded",
      retryAfter: Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)),
      timestamp: new Date().toISOString(),
    }
  }
  return null
}

export function recordSuccess(source: string, normalized: boolean): void {
  recordAccepted(source)
  if (normalized) {
    logIngestionEvent({
      eventType: "normalization_applied",
      source,
      accepted: true,
      normalized: true,
    })
  }
  logIngestionEvent({
    eventType: "telemetry_accepted",
    source,
    accepted: true,
  })
}

export { recordAccepted, recordRejected }
