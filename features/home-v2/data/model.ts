/**
 * HOME V2 view models.
 *
 * Presentation-facing shapes only. They are produced by pure adapters from the
 * systems that already exist (mobile telemetry, grow domain, captures) and are
 * consumed by dumb components. Nothing here measures, evaluates or invents data.
 */

export type LabThemeId = "negro" | "verde" | "blanco"

/** Where a value comes from. "unavailable" means there is nothing to show. */
export type Provenance = "real" | "simulated" | "unavailable"

export type Tone = "ok" | "info" | "watch" | "warn" | "crit" | "sim" | "muted"

// ── Environment ───────────────────────────────────────────

export type MetricId = "temperature" | "humidity"

export interface MetricModel {
  id: MetricId
  label: string
  unit: string
  /** null until a real/simulated sample exists. Never zero-filled. */
  value: number | null
  decimals: number
  /** Smallest value span a chart may zoom into, so sensor noise never looks like a swing. */
  minSpan: number
  /** null while the trend is not reliable (fewer than two samples). */
  trend: "up" | "down" | "flat" | null
  delta: number | null
  condition: { label: string; tone: Tone } | null
  /** Samples for this view, oldest → newest: persisted for real devices, generated for demo. */
  series: number[]
  /** Display time ("HH:MM:SS") of each sample, same order/length as `series`. */
  times: string[]
  /** Target range of the (sample) species profile. Only the demonstration provides it; never inferred. */
  target?: { min: number; max: number }
}

/** General state of the environment, in the five levels the Inicio status card can express. */
export type StatusLevel = "stable" | "optimizing" | "prealert" | "alert" | "nodata"

export type EnvironmentModel =
  | { status: "waiting"; reason: "loading" | "disconnected"; title: string; detail: string }
  | {
      status: "ready"
      provenance: Exclude<Provenance, "unavailable">
      dimmed: boolean
      metrics: MetricModel[]
      /**
       * What the series in `metrics` is: persisted real samples or a labelled
       * demonstration series. `session` remains for legacy adapters only.
       */
      window: "session" | "demo" | "persisted"
      /** Overall state from the shared environment engine; null until it has caught up. */
      overall: { label: string; detail: string; tone: Tone; level: StatusLevel } | null
    }

// ── Device ────────────────────────────────────────────────

export type DeviceKind = "connecting" | "live" | "simulated" | "stale" | "degraded" | "offline"

export interface ActuatorModel {
  id: "fan" | "humidifier"
  label: string
  /** Reported state. This UI never commands actuators. */
  state: "on" | "off" | "unknown"
}

export interface DeviceModel {
  name?: string
  lastSeenAt?: string | null
  kind: DeviceKind
  label: string
  provenance: Provenance
  tone: Tone
  /** ISO time of the last real device sample (live source only). */
  lastSampleAt: string | null
  actuators: ActuatorModel[]
}

// ── Cultivation ───────────────────────────────────────────

export interface StageStepModel {
  id: string
  label: string
  status: "done" | "current" | "upcoming"
  /** Elapsed-days heuristic only. Never presented as the current stage. */
  estimated: boolean
}

export type LogKind = "milestone" | "stage" | "photo" | "observation" | "environment" | "device"

export interface LogEntryModel {
  id: string
  at: string
  kind: LogKind
  title: string
  /** Longer description (observations, photo captions). */
  detail?: string
  tone: Tone
  /** Real fact of the run record vs. simulated fixture. */
  provenance: Exclude<Provenance, "unavailable">
  /** Photo this entry refers to (demo logbook only). */
  photoId?: string
  /** Crop day, when the source states it (the demo story is told by calendar day). Otherwise derived from the start. */
  day?: number
}

export type CultivationFailure =
  | "unauthorized"
  | "not_found"
  | "profile_missing"
  | "unavailable"
  | "network_error"
  | "invalid"

export type CultivationModel =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "failed"; reason: CultivationFailure; title: string; detail: string }
  | {
      status: "ready"
      provenance: Exclude<Provenance, "unavailable">
      name: string
      scientificName: string
      /** Species profile is a labelled sample, not validated guidance. */
      sampleProfile: boolean
      startedAt: string
      /** 1-based elapsed day (24-hour blocks), null if the start is invalid/in the future. */
      day: number | null
      stage: { id: string; label: string; position: number; total: number; confirmedAt: string | null }
      steps: StageStepModel[]
      possibleChange: { label: string } | null
      log: LogEntryModel[]
    }

// ── Photos ────────────────────────────────────────────────

export interface PhotoModel {
  id: string
  url: string
  capturedAt: string
  /** Real files vs. clearly labelled demonstration illustrations. */
  kind: "capture" | "demo"
  /** Crop day this picture belongs to (demonstration photos only). */
  day?: number
  /** Short description of what the picture shows (demonstration photos only). */
  caption?: string
  /** Small version for thumbnails (demonstration photos only). */
  thumbUrl?: string
  /** Tighter crop of the same picture for the hero (demonstration photos only). */
  heroUrl?: string
}

export type PhotosModel =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "empty" }
  /** Oldest → newest. */
  | { status: "ready"; items: PhotoModel[] }

// ── History ───────────────────────────────────────────────

/** alert: active now · event: environment/device/session · crop: the crop's own record. */
export type HistoryKind = "alert" | "event" | "crop"

/** Drives the icon of a timeline entry. */
export type HistoryCategory = LogKind | "alert" | "session"

export interface HistoryEntryModel {
  id: string
  kind: HistoryKind
  category: HistoryCategory
  tone: Tone
  title: string
  detail?: string
  /** Epoch ms. null = an alert that is active right now (describes the current condition). */
  at: number | null
  /** Produced by the demonstration mode. */
  simulated: boolean
  /** Small picture for photo entries (demonstration only today). */
  photoUrl?: string
  /** Crop day of the entry, when the source states it. */
  day?: number
}

// ── MYKO Insight ──────────────────────────────────────────

/**
 * Observations come only from the demonstration engine today. In normal mode
 * there is no analysis, so the model is `none` and the UI says so.
 */
export type InsightModel =
  | { status: "none" }
  | {
      status: "demo"
      tone: Tone
      headline: string
      body: string
      /** The (simulated) facts the observation is based on. */
      basis: string[]
    }
