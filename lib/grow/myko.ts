import { findStage } from "./stages"
import type { GrowState, MykoForm, MykoViewModel, SpeciesProfile, StageId } from "./types"

/**
 * Biological stage → MYKO form is a PRESENTATION mapping declared by the
 * profile. A stage id the profile does not declare renders the earliest form
 * (never crashes, never claims development it cannot ground).
 */
export function mykoFormForStage(stage: StageId, profile?: Pick<SpeciesProfile, "stages"> | null): MykoForm {
  return findStage(profile, stage)?.mykoForm ?? "early"
}

function messageKey(state: GrowState): string {
  if (state.freshness === "offline") return "myko.status.offline"
  if (state.freshness === "stale") return "myko.status.stale"
  if (state.health === "unknown") return "myko.status.unknown"
  if (state.health === "critical") return "myko.status.critical"
  const need = state.needs[0]
  if (need?.kind === "humidity") return "myko.status.humidity_low"
  if (need?.kind === "ventilation") return "myko.status.humidity_high"
  if (need?.kind === "temperature_attention") return "myko.status.temperature_attention"
  return state.origin === "simulated" ? "myko.status.simulated" : "myko.status.healthy"
}

export function toMykoViewModel(state: GrowState, profile?: Pick<SpeciesProfile, "stages" | "morphology"> | null): MykoViewModel {
  const isUnknown = state.freshness !== "live" || state.health === "unknown"
  return {
    form: mykoFormForStage(state.confirmedStage, profile),
    ...(profile?.morphology && profile.morphology !== "fungal" ? { morphology: profile.morphology } : {}),
    mood: isUnknown ? "uncertain" : state.health === "critical" ? "distressed" : state.health === "attention" ? "concerned" : "content",
    activity: "idle",
    attention: isUnknown ? "unknown" : state.health === "critical" ? "urgent" : state.health === "attention" ? "notice" : "none",
    messageKey: messageKey(state),
    origin: state.origin,
  }
}
