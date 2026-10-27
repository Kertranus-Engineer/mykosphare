import { analyzeHome, targetsFromCultivation } from "@/lib/grow/application/home-analysis"
import type { HomeCultivation, HomeProfile } from "@/lib/grow/application/home-read"
import type { ActivityEvent, AssistantContext, IntelligenceReport, Recommendation, Severity, Tone as IntelligenceTone } from "@/lib/grow/intelligence"
import type { CloudHomeState } from "./cloud-home"
import type { HistoryEntryModel, Tone } from "./model"

export { targetsFromCultivation }

/**
 * Presentation-side projection of MYKO Intelligence for HOME. The engine lives in lib/grow/intelligence, the
 * shared analysis in lib/grow/application/home-analysis; this module only maps results to view models.
 */
export interface IntelligenceView {
  report: IntelligenceReport
  context: AssistantContext
  /** Finished out-of-range episodes and signal gaps derived from stored readings. */
  events: ActivityEvent[]
  /** Timeline entries (active alerts first), ready for the activity feed and the notification badge. */
  historyEntries: HistoryEntryModel[]
  cultivation: HomeCultivation | null
  profiles: HomeProfile[]
  chamberId: string
  deviceName: string | null
  /** Where the targets come from, e.g. "Sample oyster mushroom · Colonización". null = none configured. */
  targetsLabel: string | null
}

export const TONE: Record<IntelligenceTone, Tone> = { ok: "ok", info: "info", attention: "warn", critical: "crit", muted: "muted" }
export const SEVERITY_TONE: Record<Severity, Tone> = { info: "info", attention: "warn", critical: "crit" }

const DEVICE_KINDS = new Set(["device_offline", "device_disabled", "reading_stale", "sensor_invalid"])
function activeAlert(rec: Recommendation): HistoryEntryModel {
  return {
    id: rec.id, kind: "alert", category: DEVICE_KINDS.has(rec.findingKind) ? "device" : "environment",
    tone: SEVERITY_TONE[rec.severity], title: rec.title, detail: rec.body, at: null, simulated: false,
  }
}

export function buildIntelligenceView(state: CloudHomeState, now: number): IntelligenceView | null {
  const result = state.result
  if (result?.status !== "ready") return null
  const { report, events, context, targets } = analyzeHome(result, state.history, now)
  const active = report.recommendations
    .filter(rec => rec.severity !== "info" || rec.findingKind === "device_offline" || rec.findingKind === "reading_stale")
    .map(activeAlert)
  const past = events.map<HistoryEntryModel>(event => ({
    id: event.id, kind: "event", category: event.kind === "signal_lost" ? "device" : "environment", tone: SEVERITY_TONE[event.severity],
    title: event.title, detail: event.detail, at: Date.parse(event.startedAt), simulated: false,
  }))
  return {
    report, context, events, historyEntries: [...active, ...past],
    cultivation: result.cultivation ?? null, profiles: result.profiles ?? [], chamberId: result.chamber.id,
    deviceName: result.device?.name ?? null, targetsLabel: targets?.label ?? null,
  }
}
