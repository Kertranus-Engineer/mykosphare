import type { GrowNeed, GrowState } from "../types"
import { GROW_COPY } from "./copy.es"
import type { GrowTone } from "./status"

export interface PresentedNeed {
  key: string
  title: string
  body: string
  hint: string
  tone: GrowTone
  urgent: boolean
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

/** Presents domain-derived needs. It never derives new needs itself. */
export function presentNeeds(state: GrowState): PresentedNeed[] {
  return state.needs.map((need, index) => {
    const copy = copyFor(need, state)
    const tone: GrowTone = need.severity === "critical" ? "critical" : need.severity === "attention" ? "attention" : "unknown"
    return { key: `${need.kind}-${index}`, ...copy, tone, urgent: need.severity === "critical" }
  })
}
