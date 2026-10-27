/**
 * Pure adapters: existing systems → HOME V2 view models.
 *
 * Rules enforced here (and covered by tests):
 *  - a missing metric is `null`, never zero;
 *  - simulated data is always labelled simulated;
 *  - no percentages of progress are produced anywhere;
 *  - the suggested (elapsed-days) stage never replaces the confirmed stage.
 */
import { indicatorStatusEs, STATE_ES } from "@/features/mobile/i18n"
import type { ConnectionKind, MobileTelemetry } from "@/features/mobile/use-mobile-telemetry"
import type { ActivityItem, ActivitySeverity } from "@/features/mobile/use-mobile-activity"
import type { EnvState } from "@/lib/useEnvironment"
import type { GrowTimelineEvent } from "@/lib/grow/timeline"
import type { GrowSnapshot, StageId, SpeciesProfile } from "@/lib/grow/types"
import { cultivationDay, GROW_STAGE_ORDER, presentSpecies, stageLabel } from "@/lib/grow/presentation"
import type { GrowView } from "@/features/grow/data/grow-view"
import { resolveTelemetry } from "./resolve"
import { COPY } from "../copy"
import type {
  ActuatorModel,
  CultivationFailure,
  CultivationModel,
  DeviceKind,
  DeviceModel,
  EnvironmentModel,
  HistoryEntryModel,
  LogEntryModel,
  LogKind,
  MetricModel,
  PhotoModel,
  PhotosModel,
  StageStepModel,
  StatusLevel,
  Tone,
} from "./model"

// ── Environment ───────────────────────────────────────────

const STATE_TONE: Record<EnvState, Tone> = {
  STABLE: "ok",
  OPTIMIZING: "info",
  RECOVERY: "info",
  PRE_WARNING: "watch",
  WARNING: "warn",
  ESCALATION: "warn",
  CRITICAL: "crit",
}

const STATE_LEVEL: Record<EnvState, StatusLevel> = {
  STABLE: "stable",
  OPTIMIZING: "optimizing",
  RECOVERY: "optimizing",
  PRE_WARNING: "prealert",
  WARNING: "alert",
  ESCALATION: "alert",
  CRITICAL: "alert",
}

const INDICATOR_TONE: Record<string, Tone> = {
  Nominal: "ok",
  Low: "warn",
  High: "warn",
  Elevated: "warn",
  Critical: "crit",
}

function metric(
  tel: MobileTelemetry,
  id: "temperature" | "humidity",
): MetricModel {
  const reading = tel[id]
  const trendReliable = tel.history.length >= 2
  const trend = !trendReliable ? null : reading.trend === "up" ? "up" : reading.trend === "down" ? "down" : "flat"
  const status = reading.status
  return {
    id,
    label: id === "temperature" ? COPY.environment.temperature : COPY.environment.humidity,
    unit: id === "temperature" ? "°C" : "%",
    value: reading.value,
    decimals: 1,
    minSpan: id === "temperature" ? 2 : 8,
    trend,
    delta: trendReliable && Number.isFinite(reading.delta) ? reading.delta : null,
    condition: status ? { label: indicatorStatusEs(status), tone: INDICATOR_TONE[status] ?? "muted" } : null,
    series: tel.history.map((point) => (id === "temperature" ? point.temperature : point.humidity)),
    times: tel.history.map((point) => point.time),
  }
}

/**
 * Real telemetry only. The silent simulator inside the shared hook is NOT data here (it resolves
 * to UNAVAILABLE); demonstration values come from the demo engine (data/demo), never from this hook.
 */
export function toEnvironmentModel(tel: MobileTelemetry): EnvironmentModel {
  const source = resolveTelemetry(tel)
  if (source === "LOADING") {
    return { status: "waiting", reason: "loading", title: COPY.environment.waitingTitle, detail: COPY.environment.waitingDetail }
  }
  // No ESP32 reporting. The shared hook's silent simulator does NOT count as data outside the demo mode.
  if (source === "UNAVAILABLE") {
    return { status: "waiting", reason: "disconnected", title: COPY.environment.noDeviceTitle, detail: COPY.environment.noDeviceDetail }
  }

  let overall: { label: string; detail: string; tone: Tone; level: StatusLevel } | null = null
  if (tel.envReady) {
    const copy = STATE_ES[tel.env.state]
    overall = { label: copy.label, detail: copy.title, tone: STATE_TONE[tel.env.state], level: tel.dimmed ? "nodata" : STATE_LEVEL[tel.env.state] }
  }

  return {
    status: "ready",
    provenance: "real",
    dimmed: tel.dimmed,
    metrics: [metric(tel, "temperature"), metric(tel, "humidity")],
    window: "session",
    overall,
  }
}

// ── Device ────────────────────────────────────────────────

const DEVICE_TONE: Record<ConnectionKind, Tone> = {
  live: "ok",
  simulated: "sim",
  degraded: "warn",
  stale: "warn",
  offline: "crit",
  connecting: "muted",
}

function actuator(id: ActuatorModel["id"], reported: boolean | null, dimmed: boolean): ActuatorModel {
  return {
    id,
    label: id === "fan" ? COPY.device.fan : COPY.device.humidifier,
    // A reading that is no longer fresh is not a current state.
    state: reported === null || dimmed ? "unknown" : reported ? "on" : "off",
  }
}

export function toDeviceModel(tel: MobileTelemetry): DeviceModel {
  if (resolveTelemetry(tel) === "UNAVAILABLE") {
    return {
      kind: "offline",
      label: COPY.device.disconnected,
      provenance: "unavailable",
      tone: "muted",
      lastSampleAt: null,
      actuators: [actuator("fan", null, true), actuator("humidifier", null, true)],
    }
  }
  const kind: DeviceKind = tel.connection.kind
  return {
    kind,
    label: tel.connection.label,
    provenance: tel.source === "live" ? "real" : "unavailable",
    tone: DEVICE_TONE[kind],
    lastSampleAt: tel.lastDeviceSampleAt,
    actuators: [actuator("fan", tel.fan, tel.dimmed), actuator("humidifier", tel.humidifier, tel.dimmed)],
  }
}

// ── Stages ────────────────────────────────────────────────

/**
 * Stages for this crop. Derived from the species profile (the stages it defines
 * targets for) instead of a hardcoded list; falls back to the full cycle when the
 * profile defines fewer than two. The confirmed stage is always part of the plan.
 */
export function resolveStagePlan(profile: Pick<SpeciesProfile, "stageTargets"> & Partial<Pick<SpeciesProfile, "stages">>, confirmed: StageId): StageId[] {
  if (profile.stages?.length) {
    const order = profile.stages.map(stage => stage.id)
    return order.includes(confirmed) ? order : [...order, confirmed]
  }
  const defined = GROW_STAGE_ORDER.filter((stage) => profile.stageTargets[stage] !== undefined)
  const base = defined.length >= 2 ? defined : [...GROW_STAGE_ORDER]
  return GROW_STAGE_ORDER.filter((stage) => base.includes(stage) || stage === confirmed)
}

export function buildStageSteps(
  plan: readonly StageId[],
  confirmed: StageId,
  suggested: StageId | null,
): { steps: StageStepModel[]; possibleChange: { label: string } | null } {
  const currentIndex = plan.indexOf(confirmed)
  const suggestedIndex = suggested === null ? -1 : plan.indexOf(suggested)
  // Only a LATER stage is a meaningful suggestion; it never replaces the confirmed one.
  const estimate = suggestedIndex > currentIndex ? suggested : null
  const steps = plan.map((stage, index): StageStepModel => ({
    id: stage,
    label: stageLabel(stage),
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
    estimated: stage === estimate,
  }))
  return { steps, possibleChange: estimate ? { label: stageLabel(estimate) } : null }
}

// ── Cultivation ───────────────────────────────────────────

function logEntry(event: GrowTimelineEvent): LogEntryModel {
  const events = COPY.log.events
  const metricKey = event.metric ?? "humidity"
  const base = { id: event.id, at: event.at, provenance: event.origin === "simulated" ? ("simulated" as const) : ("real" as const) }
  const entry = (kind: LogKind, title: string, tone: Tone): LogEntryModel => ({ ...base, kind, title, tone })
  switch (event.kind) {
    case "cultivation_started":
      return entry("milestone", events.cultivation_started, "ok")
    case "stage_confirmed":
      return entry("stage", events.stage_confirmed(event.stage ? stageLabel(event.stage) : "—"), "info")
    case "capture_added":
      return entry("photo", events.capture_added, "info")
    case "condition_stable":
      return entry("environment", events.condition_stable, "ok")
    case "metric_dropped":
      return entry("environment", events.metric_dropped[metricKey], "watch")
    case "metric_rose":
      return entry("environment", events.metric_rose[metricKey], "watch")
    case "metric_recovered":
      return entry("environment", events.metric_recovered[metricKey], "ok")
    case "metric_missing":
      return entry("device", events.metric_missing[metricKey], "muted")
    case "reading_received":
      return entry("device", events.reading_received, "muted")
    case "signal_lost":
      return entry("device", events.signal_lost, "muted")
  }
}

/** Newest first. */
export function toLog(events: readonly GrowTimelineEvent[]): LogEntryModel[] {
  return events
    .filter((event) => Number.isFinite(new Date(event.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map(logEntry)
}

function readyCultivation(snapshot: GrowSnapshot, timeline: readonly GrowTimelineEvent[], evaluatedAt: string, mode: "real" | "simulation"): CultivationModel {
  const species = presentSpecies(snapshot.profile)
  const confirmed = snapshot.state.confirmedStage
  const plan = resolveStagePlan(snapshot.profile, confirmed)
  const { steps, possibleChange } = buildStageSteps(plan, confirmed, snapshot.state.suggestedStage)
  const position = plan.indexOf(confirmed) + 1
  const simulated = mode === "simulation" || snapshot.state.origin === "simulated"
  return {
    status: "ready",
    provenance: simulated ? "simulated" : "real",
    name: species.name,
    scientificName: species.scientificName,
    sampleProfile: species.isSample,
    startedAt: snapshot.run.startedAt,
    day: cultivationDay(snapshot.run.startedAt, evaluatedAt),
    stage: {
      id: confirmed,
      label: stageLabel(confirmed),
      position,
      total: plan.length,
      confirmedAt: snapshot.run.stageConfirmedAt ?? null,
    },
    steps,
    possibleChange,
    log: toLog(timeline),
  }
}

export function toCultivationModel(view: GrowView): CultivationModel {
  switch (view.status) {
    case "loading":
      return { status: "loading" }
    case "unconfigured":
    case "no_active_run":
      return { status: "empty" }
    case "ready":
      return readyCultivation(view.snapshot, view.timeline, view.evaluatedAt, view.mode)
    default: {
      const reason: CultivationFailure = view.status
      const copy = COPY.failure[reason]
      return { status: "failed", reason, title: copy.title, detail: copy.detail }
    }
  }
}

// ── Photos ────────────────────────────────────────────────

export interface CaptureSource {
  images: { name: string; url: string; uploadedAt: string }[]
  loading: boolean
  /** Raw error message from the captures hook (null when fine). Classified here, not in the UI. */
  error: string | null
}

const STORAGE_NOT_CONFIGURED = "Supabase not configured"
/** Storage reachable but nothing there yet (e.g. the bucket was never created) is "no photos", not an error. */
const STORAGE_EMPTY = /bucket.*not.*found|not.*found/i

export function classifyCaptureError(error: string | null): "none" | "unavailable" | "empty" | "error" {
  if (!error) return "none"
  if (error === STORAGE_NOT_CONFIGURED) return "unavailable"
  if (STORAGE_EMPTY.test(error)) return "empty"
  return "error"
}

export function toPhotosModel(captures: CaptureSource): PhotosModel {
  if (captures.loading) return { status: "loading" }
  const problem = classifyCaptureError(captures.error)
  if (problem === "unavailable") return { status: "unavailable" }
  if (problem === "empty") return { status: "empty" }
  if (problem === "error") return { status: "error" }
  const items = captures.images
    .filter((image) => image.url && Number.isFinite(new Date(image.uploadedAt).getTime()))
    .map((image): PhotoModel => ({ id: image.name, url: image.url, capturedAt: image.uploadedAt, kind: "capture" }))
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
  return items.length === 0 ? { status: "empty" } : { status: "ready", items }
}

// ── History ───────────────────────────────────────────────

const SEVERITY_TONE: Record<ActivitySeverity, Tone> = { critical: "crit", warning: "warn", success: "ok", info: "info" }

export function severityToTone(severity: ActivitySeverity): Tone {
  return SEVERITY_TONE[severity]
}

/** Active alerts first, then newest first. */
export function byRecency(a: HistoryEntryModel, b: HistoryEntryModel): number {
  if (a.at === null && b.at !== null) return -1
  if (a.at !== null && b.at === null) return 1
  return (b.at ?? 0) - (a.at ?? 0)
}

/**
 * Real session activity (alerts, bus events, state changes). Anything derived from simulated
 * telemetry is dropped: the demonstration mode never goes through here (its history comes from
 * the demo engine). Session activity is NOT persisted: callers must say so.
 */
export function toHistoryEntries(activity: readonly ActivityItem[]): HistoryEntryModel[] {
  return activity
    .filter((item) => !item.simulated)
    .map((item): HistoryEntryModel => ({
      id: item.id,
      kind: item.kind === "alert" ? "alert" : "event",
      category: item.kind === "alert" ? "alert" : "session",
      tone: severityToTone(item.severity),
      title: item.title,
      detail: item.detail,
      at: item.timestamp,
      simulated: false,
    }))
    .sort(byRecency)
}

/** The crop's own record (run milestones, confirmed stages, captures) as timeline entries. */
export function toCropHistory(log: readonly LogEntryModel[]): HistoryEntryModel[] {
  return log.map((entry): HistoryEntryModel => ({
    id: entry.id,
    kind: entry.kind === "environment" || entry.kind === "device" ? "event" : "crop",
    category: entry.kind,
    tone: entry.tone,
    title: entry.title,
    detail: entry.detail,
    at: new Date(entry.at).getTime(),
    simulated: entry.provenance === "simulated",
    day: entry.day,
  }))
}
