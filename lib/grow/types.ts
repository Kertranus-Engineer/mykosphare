/** Pure domain contracts for cultivation state. No UI or infrastructure concerns. */

export type GrowthStage =
  | "inoculation"
  | "colonization"
  | "consolidation"
  | "primordia"
  | "fruiting"
  | "harvest"

export type DataOrigin = "real" | "simulated"

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

export interface StageTargets {
  temperature?: MetricTarget
  humidity?: MetricTarget
  /** Reserved for future observed metrics; no current evaluator uses these. */
  metrics?: Record<string, MetricTarget>
}

export interface SpeciesProfile {
  id: string
  commonName: string
  scientificName: string
  /** Profiles labelled sample must never be presented as validated cultivation guidance. */
  kind: "sample" | "validated"
  stageTargets: Partial<Record<GrowthStage, StageTargets>>
}

export interface CultivationRun {
  id: string
  speciesProfileId: string
  startedAt: string
  /** The confirmed stage is a product fact, never inferred from elapsed time. */
  confirmedStage: GrowthStage
  stageConfirmedAt?: string
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
  confirmedStage: GrowthStage
  suggestedStage: GrowthStage | null
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
