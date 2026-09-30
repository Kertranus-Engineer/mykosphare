import type { GrowState, MykoForm, MykoViewModel } from "./types"

function formForStage(stage: GrowState["confirmedStage"]): MykoForm {
  if (stage === "primordia") return "emerging"
  if (stage === "fruiting") return "mature"
  if (stage === "harvest") return "complete"
  return "early"
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

export function toMykoViewModel(state: GrowState): MykoViewModel {
  const isUnknown = state.freshness !== "live" || state.health === "unknown"
  return {
    form: formForStage(state.confirmedStage),
    mood: isUnknown ? "uncertain" : state.health === "critical" ? "distressed" : state.health === "attention" ? "concerned" : "content",
    activity: "idle",
    attention: isUnknown ? "unknown" : state.health === "critical" ? "urgent" : state.health === "attention" ? "notice" : "none",
    messageKey: messageKey(state),
    origin: state.origin,
  }
}
