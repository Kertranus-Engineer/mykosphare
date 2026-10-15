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
import type { GrowSnapshot, GrowthStage, SpeciesProfile } from "@/lib/grow/types"
import { cultivationDay, GROW_STAGE_ORDER, presentSpecies, stageLabel } from "@/lib/grow/presentation"
import type { GrowView } from "@/features/grow/data/grow-view"
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
  MetricModel,
  PhotoModel,
  PhotosModel,
  StageStepModel,
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

export function toEnvironmentModel(tel: MobileTelemetry): EnvironmentModel {
  if (!tel.hasData || tel.source === "none") {
    const offline = tel.connection.kind === "offline"
    return offline
      ? { status: "waiting", title: COPY.environment.offlineTitle, detail: COPY.environment.offlineDetail }
      : { status: "waiting", title: COPY.environment.waitingTitle, detail: COPY.environment.waitingDetail }
  }

  const provenance = tel.source === "simulated" ? "simulated" : "real"
  let overall: { label: string; detail: string; tone: Tone } | null = null
  if (tel.envReady) {
    const copy = STATE_ES[tel.env.state]
    const base = STATE_TONE[tel.env.state]
    // Simulated data must never look like a healthy real reading.
    const tone: Tone = provenance === "simulated" && (base === "ok" || base === "info") ? "sim" : base
    overall = { label: copy.label, detail: copy.title, tone }
  }

  return {
    status: "ready",
    provenance,
    dimmed: tel.dimmed,
    metrics: [metric(tel, "temperature"), metric(tel, "humidity")],
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
  const kind: DeviceKind = tel.connection.kind
  return {
    kind,
    label: tel.connection.label,
    provenance: tel.source === "live" ? "real" : tel.source === "simulated" ? "simulated" : "unavailable",
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
export function resolveStagePlan(profile: Pick<SpeciesProfile, "stageTargets">, confirmed: GrowthStage): GrowthStage[] {
  const defined = GROW_STAGE_ORDER.filter((stage) => profile.stageTargets[stage] !== undefined)
  const base = defined.length >= 2 ? defined : [...GROW_STAGE_ORDER]
  return GROW_STAGE_ORDER.filter((stage) => base.includes(stage) || stage === confirmed)
}

export function buildStageSteps(
  plan: readonly GrowthStage[],
  confirmed: GrowthStage,
  suggested: GrowthStage | null,
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
  switch (event.kind) {
    case "cultivation_started":
      return { ...base, title: events.cultivation_started, tone: "ok" }
    case "stage_confirmed":
      return { ...base, title: events.stage_confirmed(event.stage ? stageLabel(event.stage) : "—"), tone: "info" }
    case "capture_added":
      return { ...base, title: events.capture_added, tone: "info" }
    case "condition_stable":
      return { ...base, title: events.condition_stable, tone: "ok" }
    case "metric_dropped":
      return { ...base, title: events.metric_dropped[metricKey], tone: "watch" }
    case "metric_rose":
      return { ...base, title: events.metric_rose[metricKey], tone: "watch" }
    case "metric_recovered":
      return { ...base, title: events.metric_recovered[metricKey], tone: "ok" }
    case "metric_missing":
      return { ...base, title: events.metric_missing[metricKey], tone: "muted" }
    case "reading_received":
      return { ...base, title: events.reading_received, tone: "muted" }
    case "signal_lost":
      return { ...base, title: events.signal_lost, tone: "muted" }
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
  /** Human-readable error from the existing captures hook, null when fine. */
  error: string | null
  /** Storage is simply not configured (not a failure the user can retry). */
  unavailable: boolean
}

export function toPhotosModel(captures: CaptureSource): PhotosModel {
  if (captures.loading) return { status: "loading" }
  if (captures.unavailable) return { status: "unavailable" }
  if (captures.error) return { status: "error" }
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

/**
 * One chronological feed from the session activity (alerts, bus events, state
 * changes) and, when a crop exists, its logbook. Active alerts come first; the
 * rest is newest first. Session activity is NOT persisted: callers must say so.
 */
export function toHistoryEntries(activity: readonly ActivityItem[], cultivation: CultivationModel): HistoryEntryModel[] {
  const fromActivity = activity.map((item): HistoryEntryModel => ({
    id: item.id,
    kind: item.kind === "alert" ? "alert" : "event",
    tone: severityToTone(item.severity),
    title: item.title,
    detail: item.detail,
    at: item.timestamp,
    simulated: false,
  }))
  const fromCrop =
    cultivation.status === "ready"
      ? cultivation.log.map((entry): HistoryEntryModel => ({
          id: `crop-${entry.id}`,
          kind: "crop",
          tone: entry.tone,
          title: entry.title,
          at: new Date(entry.at).getTime(),
          simulated: entry.provenance === "simulated",
        }))
      : []
  return [...fromActivity, ...fromCrop].sort((a, b) => {
    if (a.at === null && b.at !== null) return -1
    if (a.at !== null && b.at === null) return 1
    return (b.at ?? 0) - (a.at ?? 0)
  })
}
