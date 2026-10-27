import { analyzeHome, targetsFromCultivation } from "@/lib/grow/application/home-analysis"
import type { HomeCultivation, HomeProfile } from "@/lib/grow/application/home-read"
import { actuatorName, describeControl, errorText, reasonName, type ControlStatus } from "@/lib/grow/control/status"
import type { ControlEvent, HomeControl } from "@/lib/grow/control/types"
import { describeTargets } from "@/lib/grow/control/request"
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
  /** Desired vs reported control state, straight from the device's own reports. */
  control: HomeControl | null
  controlStatus: ControlStatus
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

/** Device events as timeline entries. "Simulado" is in the wording: the demo flag is reserved for the example view. */
function controlEntries(control: HomeControl | null): HistoryEntryModel[] {
  if (!control) return []
  const entries: HistoryEntryModel[] = []
  if (control.desired) {
    entries.push({ id: `cfg:${control.desired.version}`, kind: "event", category: "device", tone: "info", at: Date.parse(control.desired.createdAt), simulated: false,
      title: `Objetivo guardado (v${control.desired.version})`, detail: `${describeTargets(control.desired.targets)}${control.desired.mode === "simulation" ? " · prueba, sin salidas" : ""}` })
  }
  const text = (e: ControlEvent): { title: string; detail?: string; tone: Tone } | null => {
    const v = e.version ? ` v${e.version}` : ""
    switch (e.kind) {
      case "config_received": return { title: `Configuración${v} recibida por MYKO-001`, tone: "info" }
      case "config_applied": return { title: `Configuración${v} aplicada por MYKO-001`, tone: "ok" }
      case "config_rejected": return { title: `MYKO-001 rechazó la configuración${v}`, detail: errorText(String(e.detail.error ?? "")), tone: "warn" }
      case "actuation": return { title: `Simulación: ${e.detail.command === "on" ? "encendería" : "apagaría"} ${actuatorName(String(e.detail.actuator ?? ""))}`, detail: `${reasonName(String(e.detail.reason ?? ""))}${typeof e.detail.value === "number" ? ` · medición ${e.detail.value}` : ""}. No se activó ninguna salida.`, tone: "muted" }
      case "safety": return { title: "Modo seguro: sensor no confiable", detail: "Las salidas simuladas se apagaron.", tone: "warn" }
      case "boot": return { title: "MYKO-001 se reinició", tone: "muted" }
      case "error": return { title: "MYKO-001 informó un error", detail: String(e.detail.reason ?? ""), tone: "warn" }
      default: return null
    }
  }
  for (const e of control.events) {
    const t = text(e)
    if (t) entries.push({ id: `ev:${e.at}:${e.kind}:${String(e.detail.actuator ?? "")}`, kind: "event", category: e.kind === "actuation" || e.kind === "safety" ? "environment" : "device", tone: t.tone, at: Date.parse(e.at), simulated: false, title: t.title, detail: t.detail })
  }
  return entries
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
    report, context, events, historyEntries: [...active, ...past, ...controlEntries(result.control ?? null)],
    control: result.control ?? null, controlStatus: describeControl(result.control, now),
    cultivation: result.cultivation ?? null, profiles: result.profiles ?? [], chamberId: result.chamber.id,
    deviceName: result.device?.name ?? null, targetsLabel: targets?.label ?? null,
  }
}
