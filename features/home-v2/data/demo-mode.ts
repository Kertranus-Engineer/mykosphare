import { isGrowDemoScenario, type GrowDemoScenario } from "@/lib/grow/demo/simulation-demo"
import type { GrowRequest } from "@/features/grow/data/grow-request"
import { HOME_V2_DEMO_DEFAULT_ON } from "../config"

/**
 * Demonstration ("vista de ejemplo") mode. It starts ON for visitors who have not chosen (see
 * `config.ts` to turn that off before launch) and turns itself off as soon as a real device has
 * reported (see `device-seen.ts` and `effectiveDemo`). A saved choice always wins. The only thing
 * stored is that choice: it never writes demo data anywhere, and simulated values are always
 * labelled as such.
 */
export interface DemoState {
  enabled: boolean
  scenario: GrowDemoScenario
  /**
   * The visitor switched the example view ON by hand while a device was already connected.
   * Without it, the example view yields to a connected device.
   */
  pinned?: boolean
}

/** v2: the example view now follows the device connection, so earlier saved choices are not carried over. */
export const DEMO_STORAGE_KEY = "mykosphare-demo-mode-v2"
export const DEMO_OFF: DemoState = Object.freeze({ enabled: false, scenario: "stable" })
export const DEFAULT_DEMO_SCENARIO: GrowDemoScenario = "stable"

const DEMO_DEFAULT_ON: DemoState = Object.freeze({ enabled: true, scenario: DEFAULT_DEMO_SCENARIO })

/** What a visitor with no saved choice gets. Decided by `config.ts`. Stable identity (store snapshot). */
export function defaultDemoState(defaultOn: boolean = HOME_V2_DEMO_DEFAULT_ON): DemoState {
  return defaultOn ? DEMO_DEFAULT_ON : DEMO_OFF
}

/**
 * Tolerant parser. Nothing saved (or unreadable) means "no choice yet" → the
 * default. An explicit `{enabled:false}` is a choice and is respected.
 */
export function parseDemoState(raw: string | null, defaultOn: boolean = HOME_V2_DEMO_DEFAULT_ON): DemoState {
  const fallback = defaultDemoState(defaultOn)
  if (!raw) return fallback
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || value === null) return fallback
    const { enabled, scenario, pinned } = value as Record<string, unknown>
    if (enabled === true) {
      const state: DemoState = { enabled: true, scenario: isGrowDemoScenario(scenario) ? scenario : DEFAULT_DEMO_SCENARIO }
      return pinned === true ? { ...state, pinned: true } : state
    }
    if (enabled === false) return DEMO_OFF
    return fallback
  } catch {
    return fallback
  }
}

export function serializeDemoState(state: DemoState): string {
  if (!state.enabled) return JSON.stringify({ enabled: false })
  return JSON.stringify(state.pinned ? { enabled: true, scenario: state.scenario, pinned: true } : { enabled: true, scenario: state.scenario })
}

/**
 * What the screens actually show. The example view yields to a real device: once one has reported,
 * the visitor sees their own data unless they pinned the example view on purpose.
 */
export function effectiveDemo(chosen: DemoState, deviceSeen: boolean): DemoState {
  return chosen.enabled && deviceSeen && !chosen.pinned ? DEMO_OFF : chosen
}

/** Internal-testing compatibility: `?mode=simulation&scenario=x` means "demo ON". */
export function demoFromUrl(request: GrowRequest): DemoState | null {
  return request.kind === "simulation" ? { enabled: true, scenario: request.scenario } : null
}

export function sameDemo(a: DemoState, b: DemoState): boolean {
  return a.enabled === b.enabled && (!a.enabled || (a.scenario === b.scenario && Boolean(a.pinned) === Boolean(b.pinned)))
}

/**
 * The request the grow store should serve. While the demo is on, the crop comes
 * from the demonstration engine, so the store is not asked for anything (and a
 * real chamber is never mixed in). Simulation can never come from the URL alone
 * once the demo is off.
 */
export function effectiveGrowRequest(demo: DemoState, url: GrowRequest): GrowRequest {
  if (demo.enabled) return { kind: "unconfigured" }
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
    return defaultDemoState()
  }
}

function hasStoredChoice(): boolean {
  try {
    return localStorage.getItem(DEMO_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function getDemoSnapshot(): DemoState {
  if (snapshot === null) snapshot = read()
  return snapshot
}

/** The server cannot know the visitor's choice: it renders the default. */
export function getDemoServerSnapshot(): DemoState {
  return defaultDemoState()
}

/** Saves the visitor's explicit choice (even when it equals the default, so it survives a change of default). */
export function setDemoState(next: DemoState): void {
  const normalized: DemoState = next.enabled
    ? next.pinned
      ? { enabled: true, scenario: next.scenario, pinned: true }
      : { enabled: true, scenario: next.scenario }
    : DEMO_OFF
  if (snapshot !== null && sameDemo(snapshot, normalized) && hasStoredChoice()) return
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
