/** Pure domain contracts for cultivation state. No UI or infrastructure concerns. */

/**
 * A biological stage id. Stages are PROFILE-DRIVEN: each organism profile
 * declares its own ordered stage ids (a fungus: colonization → fruiting; a
 * flowering plant could declare vegetative → flowering). Domain logic never
 * assumes a particular vocabulary.
 */
export type StageId = string

/**
 * The fungal (Pleurotus) stage vocabulary — the first implemented profile.
 * Kept as a named type because the current DB enum and the Pleurotus copy use
 * it; generic code works with `StageId`.
 */
export type GrowthStage =
  | "inoculation"
  | "colonization"
  | "consolidation"
  | "primordia"
  | "fruiting"
  | "harvest"

export type DataOrigin = "real" | "simulated"

/**
 * Who/what produced a fact. Never collapsed: an AI interpretation can never
 * masquerade as a sensor observation, and only `manual` may confirm a stage.
 */
export type Provenance = "sensor" | "simulation" | "manual" | "vision_model" | "ai_supervisor" | "deterministic"

export function provenanceOfOrigin(origin: DataOrigin): Provenance {
  return origin === "real" ? "sensor" : "simulation"
}

export type DeviceFreshness = "live" | "stale" | "offline" | "unknown"

export type GrowCondition = "ok" | "low" | "high" | "critical" | "unknown"

export type GrowHealth = "healthy" | "attention" | "critical" | "unknown"
export type DataStatus = "complete" | "partial" | "insufficient"

export interface MetricTarget {
  min: number
  max: number
  criticalMin?: number
  criticalMax?: number
}

/**
 * Hybrid target model: the two metrics that exist in hardware today stay
 * TYPED (Pleurotus behaviour unchanged); future metrics are keyed by the
 * capability vocabulary instead of free-form strings. No evaluator reads
 * `metrics` until a real sensor exists for that capability.
 */
export interface StageTargets {
  temperature?: MetricTarget
  humidity?: MetricTarget
  metrics?: Partial<Record<MetricCapabilityKey, MetricTarget>>
}

/** Observation vocabulary. A capability is never a value: absent ≠ zero. */
export type MetricCapabilityKey = "temperature" | "humidity" | "co2" | "light" | "substrate_moisture" | "ph" | "ec" | "mass"
export type CapabilityKey = MetricCapabilityKey | "vision"

export type OrganismKind = "fungus" | "plant" | "flowering_plant"

/**
 * Which MYKO anatomy family manifests this organism. Only `fungal` is
 * implemented; other families are a seam so the twin never needs rewriting.
 */
export type MykoMorphologyFamily = "fungal" | "plant" | "flowering_plant"

/** One biological stage declared by a profile. */
export interface StageDefinition {
  id: StageId
  /** Display label when no localized copy exists for this id. */
  label?: string
  /** PRESENTATION mapping only: several biological stages may share one MYKO form. */
  mykoForm: MykoForm
  /** Heuristic for a SUGGESTION only (never confirmation): suggested from this elapsed day. */
  suggestFromDay?: number
}

/**
 * Organism profile. The name `SpeciesProfile` is kept (renaming would churn
 * the DB adapter, UI and tests for no behavioural gain); the optional fields
 * below are the organism-agnostic seam. A profile without `stages` is the
 * fungal Pleurotus vocabulary (see `profileStages`).
 */
export interface SpeciesProfile {
  id: string
  commonName: string
  scientificName: string
  /** Profiles labelled sample must never be presented as validated cultivation guidance. */
  kind: "sample" | "validated"
  organismKind?: OrganismKind
  morphology?: MykoMorphologyFamily
  /** Ordered stage declarations; absent → the fungal default. */
  stages?: readonly StageDefinition[]
  /** Observations this organism benefits from (SUPPORTED BY PROFILE). Not installation. */
  capabilities?: readonly CapabilityKey[]
  stageTargets: Partial<Record<StageId, StageTargets>>
}

export type CultivationRunStatus = "active" | "completed" | "aborted"

export interface CultivationRun {
  id: string
  speciesProfileId: string
  startedAt: string
  /** The confirmed stage is a product fact, never inferred from elapsed time. */
  confirmedStage: StageId
  stageConfirmedAt?: string
  /** Absent in legacy fixtures → treated as active. */
  status?: CultivationRunStatus
  endedAt?: string
}

export interface EnvironmentalReading {
  temperature?: number
  humidity?: number
  timestamp: string
  origin: DataOrigin
  /** Stable name of the adapter/source that observed this reading. */
  source: string
  /** Optional because the legacy ESP32 API does not currently expose one. */
  deviceId?: string
}

export interface MetricEvaluation {
  status: GrowCondition
  value: number | null
  target: MetricTarget | null
}

export type GrowNeedKind =
  | "humidity"
  | "ventilation"
  | "temperature_attention"
  | "telemetry_stale"
  | "telemetry_offline"
  | "telemetry_unknown"
  | "profile_missing"

export interface GrowNeed {
  kind: GrowNeedKind
  severity: "attention" | "critical" | "unknown"
  metric?: "temperature" | "humidity"
}

export interface GrowState {
  run: CultivationRun
  confirmedStage: StageId
  suggestedStage: StageId | null
  freshness: DeviceFreshness
  origin: DataOrigin | null
  dataStatus: DataStatus
  conditions: {
    temperature: MetricEvaluation
    humidity: MetricEvaluation
  }
  needs: GrowNeed[]
  health: GrowHealth
}

export interface FreshnessPolicy {
  staleAfterMs: number
  offlineAfterMs: number
}

export interface EvaluateGrowStateInput {
  run: CultivationRun
  profile: SpeciesProfile
  reading: EnvironmentalReading | null
  now: string | Date
  freshnessPolicy?: FreshnessPolicy
}

export type MykoForm = "early" | "emerging" | "mature" | "complete"
export type MykoMood = "content" | "concerned" | "distressed" | "uncertain"
export type MykoActivity = "idle" | "thinking" | "talking" | "celebrating"
export type MykoAttention = "none" | "notice" | "urgent" | "unknown"

export interface MykoViewModel {
  form: MykoForm
  /** Anatomy family; absent = fungal (the only implemented renderer). */
  morphology?: MykoMorphologyFamily
  mood: MykoMood
  /** Domain evaluation only emits idle; interaction layers own transient activities. */
  activity: MykoActivity
  attention: MykoAttention
  messageKey: string
  origin: DataOrigin | null
}

export interface GrowSnapshot {
  run: CultivationRun
  profile: SpeciesProfile
  reading: EnvironmentalReading | null
  state: GrowState
  myko: MykoViewModel
}
