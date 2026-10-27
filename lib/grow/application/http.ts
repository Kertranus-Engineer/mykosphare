/**
 * Small, framework-light helpers for v2 user routes. Routes validate,
 * authenticate, call the application layer and map results — nothing more.
 */
export const MAX_JSON_BYTES = 4_096

export type JsonBody = { ok: true; body: Record<string, unknown> } | { ok: false; response: Response }

/**
 * Reads a small JSON object. Requires `application/json` (a cross-site HTML
 * form cannot send it without a CORS preflight, which these routes do not
 * grant) and rejects unknown fields.
 */
export async function readJsonObject(request: Request, allowed: readonly string[]): Promise<JsonBody> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, response: Response.json({ error: "content-type must be application/json" }, { status: 415 }) }
  }
  let parsed: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_JSON_BYTES) return { ok: false, response: Response.json({ error: "payload too large" }, { status: 413 }) }
    parsed = text.length === 0 ? {} : JSON.parse(text)
  } catch {
    return { ok: false, response: Response.json({ error: "invalid JSON" }, { status: 400 }) }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, response: Response.json({ error: "body must be an object" }, { status: 400 }) }
  const unknown = Object.keys(parsed).find((key) => !allowed.includes(key))
  if (unknown) return { ok: false, response: Response.json({ error: `unsupported field: ${unknown}` }, { status: 400 }) }
  return { ok: true, body: parsed as Record<string, unknown> }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STAGE = /^[a-z][a-z0-9_]{0,47}$/

export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value)
export const isStageId = (value: unknown): value is string => typeof value === "string" && STAGE.test(value)

/** Maps an application result status to an HTTP status without leaking internals. */
export function statusFor(result: string): number {
  switch (result) {
    case "started":
      return 201
    case "confirmed":
    case "completed":
      return 200
    case "unchanged":
      return 200
    case "chamber_not_found":
    case "profile_not_found":
    case "run_not_found":
      return 404
    case "active_run_exists":
    case "run_not_active":
    case "invalid_transition":
      return 409
    case "invalid_stage":
    case "invalid_facts":
      return 422
    default:
      return 500
  }
}
