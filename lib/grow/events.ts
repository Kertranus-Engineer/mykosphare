import type { GrowHealth } from "./types"
import type { CultivationEventType } from "./twin"

/**
 * Environmental events are TRANSITIONS, never one event per reading.
 *
 *   healthy → attention|critical         ⇒ environment_attention
 *   attention|critical → healthy         ⇒ environment_recovered
 *   attention ↔ critical, unchanged, or anything involving `unknown` ⇒ none
 *
 * `unknown` (offline / stale / incomplete) never produces an event: losing
 * signal is not an environmental fact, and regaining it is not a recovery.
 *
 * Seam only in this milestone: ingestion does not yet keep the per-run
 * previous health required to call this (documented in grow-cultivation-loop.md).
 */
export function deriveEnvironmentTransition(previous: GrowHealth | null, next: GrowHealth): CultivationEventType | null {
  if (previous === null || previous === "unknown" || next === "unknown") return null
  const bad = (health: GrowHealth) => health === "attention" || health === "critical"
  if (previous === "healthy" && bad(next)) return "environment_attention"
  if (bad(previous) && next === "healthy") return "environment_recovered"
  return null
}
