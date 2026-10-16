import { GROW_DEMO_SCENARIOS, type GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import { growQueryString, parseGrowRequest, type GrowRequest, type QueryReader } from "@/features/grow/data/grow-request"
import type { LabThemeId } from "./model"

/**
 * The ONLY place that knows where HOME V2 is mounted. It IS the official `/home` now (the previous
 * HOME lives on at `/home-v1`); to move it again, change this constant and the thin route files.
 */
export const HOME_V2_BASE = "/home"

export const LAB_ROUTES = {
  home: HOME_V2_BASE,
  crop: `${HOME_V2_BASE}/cultivo`,
  environment: `${HOME_V2_BASE}/ambiente`,
  history: `${HOME_V2_BASE}/historial`,
  more: `${HOME_V2_BASE}/mas`,
} as const

/**
 * What the URL asks for. Normal navigation carries nothing: the app works with
 * no parameters. Internal/testing compatibility only:
 *
 *   ?chamber=ID                  → show a real crop through /api/v2/grow (needs a session)
 *   ?mode=simulation&scenario=x  → switches the explicit demo mode ON (internal testing)
 *
 * Query params only choose which existing view to render; they never write data.
 */
export interface LabRequest {
  grow: GrowRequest
}

export function parseLabRequest(query: QueryReader): LabRequest {
  return { grow: parseGrowRequest(query) }
}

/** Clean links: only a real chamber selection is carried; the demo lives in its own preference. */
export function labHref(path: string, request: LabRequest): string {
  if (request.grow.kind !== "real") return path
  return `${path}${growQueryString(request.grow)}`
}

export const DEMO_SCENARIOS: readonly GrowDemoScenario[] = GROW_DEMO_SCENARIOS

// ── Theme ─────────────────────────────────────────────────
// The lab keeps its own preference (it never changes the app-wide theme profile),
// so trying looks here has no side effects on HOME or the dashboard.

export const LAB_THEMES: readonly LabThemeId[] = ["negro", "verde", "blanco"]
export const DEFAULT_LAB_THEME: LabThemeId = "negro"
export const LAB_THEME_STORAGE_KEY = "mykosphare-lab-theme"

export function isLabTheme(value: unknown): value is LabThemeId {
  return typeof value === "string" && (LAB_THEMES as readonly string[]).includes(value)
}
