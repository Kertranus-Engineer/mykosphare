import { isGrowDemoScenario, type GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import type { GrowRequest } from "@/features/grow/data/grow-request"

/**
 * Explicit demonstration mode. OFF by default; the only thing it stores is the
 * user's choice to look at simulated data. It never writes demo data anywhere.
 */
export interface DemoState {
  enabled: boolean
  scenario: GrowDemoScenario
}

export const DEMO_STORAGE_KEY = "mykosphare-demo-mode"
export const DEMO_OFF: DemoState = Object.freeze({ enabled: false, scenario: "stable" })
export const DEFAULT_DEMO_SCENARIO: GrowDemoScenario = "stable"

/** Tolerant parser: anything unexpected means "off". */
export function parseDemoState(raw: string | null): DemoState {
  if (!raw) return DEMO_OFF
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || value === null) return DEMO_OFF
    const { enabled, scenario } = value as Record<string, unknown>
    return enabled === true
      ? { enabled: true, scenario: isGrowDemoScenario(scenario) ? scenario : DEFAULT_DEMO_SCENARIO }
      : DEMO_OFF
  } catch {
    return DEMO_OFF
  }
}

export function serializeDemoState(state: DemoState): string {
  return JSON.stringify(state.enabled ? { enabled: true, scenario: state.scenario } : { enabled: false })
}

/** Internal-testing compatibility: `?mode=simulation&scenario=x` means "demo ON". */
export function demoFromUrl(request: GrowRequest): DemoState | null {
  return request.kind === "simulation" ? { enabled: true, scenario: request.scenario } : null
}

export function sameDemo(a: DemoState, b: DemoState): boolean {
  return a.enabled === b.enabled && (!a.enabled || a.scenario === b.scenario)
}

/** The request the grow store should serve. Real selection is ignored while the demo is on (no mixing). */
export function effectiveGrowRequest(demo: DemoState, url: GrowRequest): GrowRequest {
  if (demo.enabled) {
    return {
      kind: "simulation",
      scenario: demo.scenario,
      stage: url.kind === "simulation" ? url.stage : null,
      notices: url.kind === "simulation" ? url.notices : [],
    }
  }
  // Simulation can never come from the URL alone once the demo is off.
  return url.kind === "simulation" ? { kind: "unconfigured" } : url
}

// ── External store (localStorage-backed, stable snapshots) ───────────────

type Listener = () => void
const listeners = new Set<Listener>()
let snapshot: DemoState | null = null

function read(): DemoState {
  try {
    return parseDemoState(localStorage.getItem(DEMO_STORAGE_KEY))
  } catch {
    return DEMO_OFF
  }
}

export function getDemoSnapshot(): DemoState {
  if (snapshot === null) snapshot = read()
  return snapshot
}

export function getDemoServerSnapshot(): DemoState {
  return DEMO_OFF
}

export function setDemoState(next: DemoState): void {
  const normalized = next.enabled ? { enabled: true as const, scenario: next.scenario } : DEMO_OFF
  if (snapshot !== null && sameDemo(snapshot, normalized)) return
  snapshot = normalized
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, serializeDemoState(normalized))
  } catch {
    // storage unavailable: the choice still holds for this page session
  }
  listeners.forEach((listener) => listener())
}

export function subscribeDemo(listener: Listener): () => void {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== DEMO_STORAGE_KEY) return
    snapshot = read()
    listener()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** Test helper: forget the cached snapshot. */
export function resetDemoStoreForTests(): void {
  snapshot = null
  listeners.clear()
}
