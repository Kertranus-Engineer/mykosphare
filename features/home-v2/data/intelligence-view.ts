import type { HomeCultivation, HomeProfile, HomeReading } from "@/lib/grow/application/home-read"
import {
  HISTORY_INTELLIGENCE_CONFIG, buildAssistantContext, deriveActivity, interpretEnvironment,
  type ActivityEvent, type AssistantContext, type EnvTargets, type IntelligenceReport, type Recommendation, type Severity, type Tone as IntelligenceTone,
} from "@/lib/grow/intelligence"
import { stageLabel } from "@/lib/grow/presentation/stage"
import type { CloudHomeState } from "./cloud-home"
import type { HistoryEntryModel, Tone } from "./model"

/**
 * Presentation-side projection of MYKO Intelligence for HOME. The engine itself lives in lib/grow/intelligence and
 * knows nothing about React; this module only wires real cloud data into it and maps results to view models.
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

const GAP_MS = 15 * 60_000
export const TONE: Record<IntelligenceTone, Tone> = { ok: "ok", info: "info", attention: "warn", critical: "crit", muted: "muted" }
export const SEVERITY_TONE: Record<Severity, Tone> = { info: "info", attention: "warn", critical: "crit" }

export function targetsFromCultivation(cultivation: HomeCultivation | null): EnvTargets | null {
  if (!cultivation?.targets) return null
  return {
    ...cultivation.targets,
    label: `${cultivation.profile.displayName} · ${stageLabel(cultivation.stage)}`,
    validation: cultivation.profile.validation,
  }
}

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
  const cultivation = result.cultivation ?? null
  const targets = targetsFromCultivation(cultivation)
  const device = result.device
  const report = interpretEnvironment({
    readings: result.readings,
    device: device ? { name: device.name, enabled: device.enabled, lastSeenAt: device.lastSeenAt } : null,
    targets, now,
  })

  // 24 h context = stored 5-minute buckets + any raw readings newer than the last bucket.
  const history: HomeReading[] = state.history ?? []
  const lastBucket = history.length ? Date.parse(history[history.length - 1]?.observedAt ?? "") : 0
  const merged = [...history, ...result.readings.filter(r => Date.parse(r.observedAt) > lastBucket)]
  const events = deriveActivity(merged, targets, now, { config: HISTORY_INTELLIGENCE_CONFIG, gapMs: GAP_MS })
    .filter(event => event.endedAt !== null) // ongoing conditions come from the live report below
  const context = buildAssistantContext({
    report, history: merged, events, now, deviceName: device?.name ?? null,
    stageLabel: cultivation ? stageLabel(cultivation.stage) : null,
  })

  const active = report.recommendations
    .filter(rec => rec.severity !== "info" || rec.findingKind === "device_offline" || rec.findingKind === "reading_stale")
    .map(activeAlert)
  const past = events.map<HistoryEntryModel>(event => ({
    id: event.id, kind: "event", category: event.kind === "signal_lost" ? "device" : "environment", tone: SEVERITY_TONE[event.severity],
    title: event.title, detail: event.detail, at: Date.parse(event.startedAt), simulated: false,
  }))

  return {
    report, context, events, historyEntries: [...active, ...past],
    cultivation, profiles: result.profiles ?? [], chamberId: result.chamber.id,
    deviceName: device?.name ?? null, targetsLabel: targets?.label ?? null,
  }
}
