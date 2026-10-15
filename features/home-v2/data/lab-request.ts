import { GROW_DEMO_SCENARIOS, type GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import { growQueryString, parseGrowRequest, type GrowRequest, type QueryReader } from "@/features/grow/data/grow-request"
import type { LabThemeId } from "./model"

export const LAB_BASE = "/design-lab/home-v2"

export const LAB_ROUTES = {
  home: LAB_BASE,
  crop: `${LAB_BASE}/cultivo`,
  environment: `${LAB_BASE}/ambiente`,
  history: `${LAB_BASE}/historial`,
} as const

/**
 * What the lab URL asks for. Everything is read-only: query params only choose
 * which existing view to render (they never write or command anything).
 *
 *   (none)                       → real mode with no chamber → empty crop state
 *   ?mode=simulation&scenario=x  → explicit simulation (existing grow demo)
 *   ?chamber=ID                  → real crop through the existing /api/v2/grow
 *   &photos=demo                 → labelled demonstration illustrations (simulation only)
 */
export interface LabRequest {
  grow: GrowRequest
  demoPhotos: boolean
}

export function parseLabRequest(query: QueryReader): LabRequest {
  const grow = parseGrowRequest(query)
  return { grow, demoPhotos: grow.kind === "simulation" && query.get("photos") === "demo" }
}

export function labHref(path: string, request: LabRequest): string {
  const params = new URLSearchParams(growQueryString(request.grow).replace(/^\?/, ""))
  if (request.demoPhotos) params.set("photos", "demo")
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export type LabScenario = "none" | GrowDemoScenario

export const LAB_SCENARIOS: readonly LabScenario[] = ["none", ...GROW_DEMO_SCENARIOS]

export function activeScenario(request: LabRequest): LabScenario | null {
  if (request.grow.kind === "simulation") return request.grow.scenario
  if (request.grow.kind === "unconfigured") return "none"
  return null
}

/** Request for a scenario chip, keeping the photos preference when it still applies. */
export function scenarioRequest(scenario: LabScenario, current: LabRequest): LabRequest {
  if (scenario === "none") return { grow: { kind: "unconfigured" }, demoPhotos: false }
  const stage = current.grow.kind === "simulation" ? current.grow.stage : null
  return { grow: { kind: "simulation", scenario, stage, notices: [] }, demoPhotos: current.demoPhotos }
}

export function withDemoPhotos(current: LabRequest, enabled: boolean): LabRequest {
  return { ...current, demoPhotos: enabled && current.grow.kind === "simulation" }
}

// ── Theme ─────────────────────────────────────────────────
// The lab keeps its own preference (it never changes the app-wide theme profile),
// so trying looks here has no side effects on HOME or the dashboard.

export const LAB_THEMES: readonly LabThemeId[] = ["negro", "verde", "blanco"]
export const DEFAULT_LAB_THEME: LabThemeId = "negro"
export const LAB_THEME_STORAGE_KEY = "mykosphare-lab-theme"

export function isLabTheme(value: unknown): value is LabThemeId {
  return typeof value === "string" && (LAB_THEMES as readonly string[]).includes(value)
}
