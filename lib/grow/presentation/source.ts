import type { DataOrigin, DeviceFreshness } from "../types"
import { GROW_COPY } from "./copy.es"
import type { GrowTone } from "./status"

/** How the experience was opened. Only an explicit request can make it "simulation". */
export type GrowMode = "real" | "simulation"

export interface PresentedSource {
  kind: "real" | "simulated"
  label: string
  description: string
}

/**
 * Provenance is independent from connection health. Simulation mode is always
 * simulated, whatever a snapshot claims; real mode is simulated only when the
 * readings themselves are declared simulated.
 */
export function presentSource(mode: GrowMode, origin: DataOrigin | null): PresentedSource {
  if (mode === "simulation") {
    return { kind: "simulated", label: GROW_COPY.source.simulated, description: GROW_COPY.source.simulatedDescription }
  }
  if (origin === "simulated") {
    return { kind: "simulated", label: GROW_COPY.source.simulated, description: GROW_COPY.source.simulatedReadingsInRealMode }
  }
  return { kind: "real", label: GROW_COPY.source.real, description: GROW_COPY.source.realDescription }
}

export interface PresentedFreshness {
  freshness: DeviceFreshness
  label: string
  tone: GrowTone
}

export function presentFreshness(freshness: DeviceFreshness): PresentedFreshness {
  return {
    freshness,
    label: GROW_COPY.freshness[freshness],
    tone: freshness === "live" ? "calm" : "unknown",
  }
}
