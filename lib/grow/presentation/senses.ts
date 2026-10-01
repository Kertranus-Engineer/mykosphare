import type { GrowSnapshot } from "../types"
import { GROW_COPY } from "./copy.es"
import { presentMetric } from "./metrics"
import type { GrowDomain, GrowIconKey } from "./icons"
import type { GrowTone } from "./status"

/**
 * Hardware as abilities: every sensor MYKOSPHARE can carry is a "sense".
 *
 * `installed` is the product capability manifest for the current hardware
 * (ESP32 + DHT22 → temperature and humidity). Adding a sensor later means
 * flipping it here and feeding real readings — MYKO gains a sense. A sense that
 * is not installed NEVER shows a value.
 */
export type GrowSenseKey = "temperature" | "humidity" | "co2" | "vision" | "mass"
export type GrowSenseMode = "feel" | "see"

interface SenseDefinition {
  key: GrowSenseKey
  mode: GrowSenseMode
  installed: boolean
  /** Metric in GrowState that carries this sense's observation, if any. */
  metric?: "temperature" | "humidity"
  icon: GrowIconKey
  domain: GrowDomain
}

export const GROW_SENSE_REGISTRY: readonly SenseDefinition[] = [
  { key: "temperature", mode: "feel", installed: true, metric: "temperature", icon: "temperature", domain: "heat" },
  { key: "humidity", mode: "feel", installed: true, metric: "humidity", icon: "humidity", domain: "water" },
  { key: "co2", mode: "feel", installed: false, icon: "co2", domain: "neutral" },
  { key: "vision", mode: "see", installed: false, icon: "vision", domain: "neutral" },
  { key: "mass", mode: "feel", installed: false, icon: "mass", domain: "neutral" },
]

export type GrowSenseState = "connected" | "no_reading" | "no_signal" | "waiting" | "not_installed"

export interface PresentedSense {
  key: GrowSenseKey
  name: string
  mode: GrowSenseMode
  modeLabel: string
  icon: GrowIconKey
  domain: GrowDomain
  state: GrowSenseState
  stateLabel: string
  /** Present only for installed senses with an actual observation. */
  value: string | null
  conditionLabel: string | null
  tone: GrowTone
  /** What this sense would add once installed. */
  future: string | null
}

function senseState(definition: SenseDefinition, snapshot: GrowSnapshot): GrowSenseState {
  if (!definition.installed || !definition.metric) return "not_installed"
  const freshness = snapshot.state.freshness
  if (freshness === "unknown" && !snapshot.reading) return "waiting"
  if (freshness === "offline" || freshness === "stale") return "no_signal"
  const value = snapshot.state.conditions[definition.metric].value
  return value === null ? "no_reading" : "connected"
}

const STATE_LABEL: Record<GrowSenseState, string> = {
  connected: GROW_COPY.senses.status.connected,
  no_reading: GROW_COPY.senses.status.noReading,
  no_signal: GROW_COPY.senses.status.noSignal,
  waiting: GROW_COPY.senses.status.waiting,
  not_installed: GROW_COPY.senses.status.notInstalled,
}

export function presentSenseCapabilities(snapshot: GrowSnapshot): PresentedSense[] {
  return GROW_SENSE_REGISTRY.map((definition) => {
    const state = senseState(definition, snapshot)
    const copy = GROW_COPY.senses.items[definition.key]
    const base = {
      key: definition.key,
      name: copy.name,
      mode: definition.mode,
      modeLabel: definition.mode === "see" ? GROW_COPY.senses.see : GROW_COPY.senses.feel,
      icon: definition.icon,
      domain: definition.domain,
      state,
      stateLabel: definition.key === "vision" && state === "not_installed" ? GROW_COPY.senses.status.notAvailable : STATE_LABEL[state],
      future: state === "not_installed" ? copy.future || null : null,
    }
    if (!definition.metric || state === "not_installed") {
      return { ...base, value: null, conditionLabel: null, tone: "unknown" as GrowTone }
    }
    const metric = presentMetric(definition.metric, snapshot.state.conditions[definition.metric], snapshot.state.freshness)
    return {
      ...base,
      value: metric.missing ? null : metric.value,
      conditionLabel: metric.missing ? null : metric.conditionLabel,
      tone: state === "connected" ? metric.tone : "unknown",
    }
  })
}

/**
 * Senses as organs on MYKO's body. Only INSTALLED capabilities are returned:
 * `active` while that sense has a live observation, `quiet` when it exists but
 * is not currently sensing (no signal / no reading / waiting). A sense that is
 * not installed never appears, lit or unlit.
 */
export interface MykoBodySense {
  key: GrowSenseKey
  state: "active" | "quiet"
  domain: GrowDomain
  /** The environment this sense perceives needs attention (from the domain tone, no thresholds here). */
  alert: "attention" | "critical" | null
}

export function presentBodySenses(snapshot: GrowSnapshot): MykoBodySense[] {
  return presentSenseCapabilities(snapshot)
    .filter((sense) => sense.state !== "not_installed")
    .map((sense) => ({
      key: sense.key,
      state: sense.state === "connected" ? "active" : "quiet",
      domain: sense.domain,
      alert: sense.state === "connected" && (sense.tone === "attention" || sense.tone === "critical") ? sense.tone : null,
    }))
}
