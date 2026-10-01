import type { GrowNeed, GrowState } from "../types"
import type { GrowTimelineEvent } from "../timeline"
import { GROW_COPY } from "./copy.es"
import { relativeAgo } from "./format"
import type { GrowDomain, GrowIconKey } from "./icons"
import type { GrowTone } from "./status"

export interface PresentedNeed {
  key: string
  kind: GrowNeed["kind"]
  title: string
  body: string
  hint: string
  icon: GrowIconKey
  domain: GrowDomain
  tone: GrowTone
  urgent: boolean
  /** "Detectado hace …" only when a matching recorded event proves it; otherwise null. */
  detected: string | null
}

function copyFor(need: GrowNeed, state: GrowState) {
  switch (need.kind) {
    case "humidity": return GROW_COPY.needs.humidity
    case "ventilation": return GROW_COPY.needs.ventilation
    case "temperature_attention": {
      const status = state.conditions.temperature.status
      return status === "low" ? GROW_COPY.needs.temperatureLow : status === "high" ? GROW_COPY.needs.temperatureHigh : GROW_COPY.needs.temperatureOut
    }
    case "telemetry_stale": return GROW_COPY.needs.telemetryStale
    case "telemetry_offline": return GROW_COPY.needs.telemetryOffline
    case "telemetry_unknown": return GROW_COPY.needs.telemetryUnknown
    case "profile_missing": return GROW_COPY.needs.profileMissing
  }
}

const IDENTITY: Record<GrowNeed["kind"], { icon: GrowIconKey; domain: GrowDomain }> = {
  humidity: { icon: "humidity", domain: "water" },
  ventilation: { icon: "air", domain: "water" },
  temperature_attention: { icon: "temperature", domain: "heat" },
  telemetry_stale: { icon: "signal", domain: "neutral" },
  telemetry_offline: { icon: "signal-off", domain: "neutral" },
  telemetry_unknown: { icon: "sense", domain: "neutral" },
  profile_missing: { icon: "memory", domain: "neutral" },
}

/** The recorded event that started this deviation, if the event feed proves one. */
function matchingEvent(need: GrowNeed, state: GrowState, events: readonly GrowTimelineEvent[]): GrowTimelineEvent | null {
  let metric: "temperature" | "humidity" | null = null
  let kinds: GrowTimelineEvent["kind"][] = []
  if (need.kind === "humidity") { metric = "humidity"; kinds = ["metric_dropped"] }
  else if (need.kind === "temperature_attention") {
    metric = "temperature"
    const status = state.conditions.temperature.status
    kinds = status === "low" ? ["metric_dropped"] : status === "high" ? ["metric_rose"] : []
  } else if (need.kind === "ventilation" && state.conditions.humidity.status === "high") { metric = "humidity"; kinds = ["metric_rose"] }
  if (!metric || kinds.length === 0) return null

  const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  // Only the latest event for this metric counts; a later recovery invalidates older drops.
  const latest = sorted.find((event) => event.metric === metric && (event.kind === "metric_recovered" || kinds.includes(event.kind)))
  return latest && kinds.includes(latest.kind) ? latest : null
}

/** Presents domain-derived needs. It never derives new needs itself. */
export function presentNeeds(state: GrowState, events: readonly GrowTimelineEvent[] = [], now?: string | Date): PresentedNeed[] {
  return state.needs.map((need, index) => {
    const copy = copyFor(need, state)
    const tone: GrowTone = need.severity === "critical" ? "critical" : need.severity === "attention" ? "attention" : "unknown"
    const event = now ? matchingEvent(need, state, events) : null
    const ago = event && now ? relativeAgo(event.at, now) : null
    return {
      key: `${need.kind}-${index}`,
      kind: need.kind,
      ...copy,
      ...IDENTITY[need.kind],
      tone,
      urgent: need.severity === "critical",
      detected: ago ? GROW_COPY.needs.detected(ago) : null,
    }
  })
}

/** Visual cue MYKO's stage shows for the primary need (icon + tone). */
export function presentNeedCue(state: GrowState): { icon: GrowIconKey; domain: GrowDomain; tone: GrowTone } | null {
  const need = state.needs[0]
  if (!need) return null
  const tone: GrowTone = need.severity === "critical" ? "critical" : need.severity === "attention" ? "attention" : "unknown"
  return { ...IDENTITY[need.kind], tone }
}
