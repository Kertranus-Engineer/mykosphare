import { buildDemoGrowComposition } from "@/lib/grow/demo/simulation-demo"
import type { GrowMode } from "@/lib/grow/presentation"
import type { GrowTimelineEvent } from "@/lib/grow/timeline"
import type { GrowSnapshot } from "@/lib/grow/types"
import type { GrowRequest } from "./grow-request"

/** Distinct non-ready states. NO DATA / OFFLINE live inside a ready snapshot. */
export type GrowFailureStatus =
  | "unconfigured"
  | "invalid"
  | "unauthorized"
  | "not_found"
  | "no_active_run"
  | "profile_missing"
  | "unavailable"
  | "network_error"

export type GrowView =
  | { status: "loading"; mode: GrowMode | null }
  | {
      status: "ready"
      mode: GrowMode
      snapshot: GrowSnapshot
      timeline: GrowTimelineEvent[]
      /** Moment the snapshot is interpreted against for relative times. */
      evaluatedAt: string
      notices: string[]
    }
  | { status: GrowFailureStatus; mode: GrowMode | null }

export function modeOf(request: GrowRequest): GrowMode | null {
  return request.kind === "simulation" ? "simulation" : request.kind === "real" ? "real" : null
}

export function buildSimulationView(request: Extract<GrowRequest, { kind: "simulation" }>, now: Date): GrowView {
  const { snapshot, timeline } = buildDemoGrowComposition({ scenario: request.scenario, stage: request.stage, now })
  return { status: "ready", mode: "simulation", snapshot, timeline, evaluatedAt: now.toISOString(), notices: request.notices }
}

const FRESHNESS = ["live", "stale", "offline", "unknown"]
const HEALTH = ["healthy", "attention", "critical", "unknown"]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Minimal structural guard for the v2 API contract. */
export function isGrowSnapshot(value: unknown): value is GrowSnapshot {
  if (!isObject(value)) return false
  const { run, profile, state, myko } = value
  return isObject(run) && typeof run.startedAt === "string" && typeof run.confirmedStage === "string"
    && isObject(profile) && typeof profile.scientificName === "string"
    && isObject(state) && FRESHNESS.includes(state.freshness as string) && HEALTH.includes(state.health as string)
    && isObject(state.conditions) && Array.isArray(state.needs)
    && isObject(myko) && typeof myko.form === "string" && typeof myko.mood === "string" && typeof myko.messageKey === "string"
}

const API_STATUS: Record<string, GrowFailureStatus> = {
  not_found: "not_found",
  no_active_run: "no_active_run",
  profile_missing: "profile_missing",
  unavailable: "unavailable",
}

export const REAL_REQUEST_TIMEOUT_MS = 10_000

/**
 * Loads a real chamber through the existing v2 endpoint. Every failure maps to an
 * explicit failure view: a real failure NEVER becomes a simulated snapshot.
 */
export async function fetchRealGrowView(
  chamberId: string,
  options: { fetchImpl?: typeof fetch; now?: () => Date; timeoutMs?: number } = {},
): Promise<GrowView> {
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REAL_REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetchImpl(`/api/v2/grow/${encodeURIComponent(chamberId)}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
  } catch {
    return { status: "network_error", mode: "real" }
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401) return { status: "unauthorized", mode: "real" }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { status: "unavailable", mode: "real" }
  }

  if (!isObject(body)) return { status: "unavailable", mode: "real" }
  if (response.ok && body.status === "ready" && isGrowSnapshot(body.snapshot)) {
    const now = options.now?.() ?? new Date()
    // Real mode has no persisted timeline source yet: show none rather than invent one.
    return { status: "ready", mode: "real", snapshot: body.snapshot, timeline: [], evaluatedAt: now.toISOString(), notices: [] }
  }
  const mapped = typeof body.status === "string" ? API_STATUS[body.status] : undefined
  return { status: mapped ?? "unavailable", mode: "real" }
}
