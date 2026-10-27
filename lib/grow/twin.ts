import { resolveCapabilities, type CapabilityStatus } from "./capabilities"
import { DEFAULT_FRESHNESS_POLICY } from "./freshness"
import { buildGrowSnapshot } from "./snapshot"
import { profileStages, stageIndex } from "./stages"
import {
  provenanceOfOrigin,
  type CapabilityKey,
  type CultivationRun,
  type EnvironmentalReading,
  type FreshnessPolicy,
  type GrowSnapshot,
  type MykoMorphologyFamily,
  type OrganismKind,
  type Provenance,
  type SpeciesProfile,
  type StageDefinition,
  type StageId,
} from "./types"

/**
 * CULTIVATION TWIN — the primary READ MODEL of a cultivation: grounded facts
 * only, composed (not duplicated) from the run record, the profile, persisted
 * observations and events. Grower UI, MYKO and the future AI Supervisor read
 * this; none of them write it. It is a projection, not a table.
 */

/** Persisted run event vocabulary: facts and TRANSITIONS, never telemetry spam. */
export type CultivationEventType =
  | "cultivation_started"
  | "stage_confirmed"
  | "environment_attention"
  | "environment_recovered"
  | "capture_received"
  | "harvest_confirmed"

export const CULTIVATION_EVENT_TYPES: readonly CultivationEventType[] = [
  "cultivation_started",
  "stage_confirmed",
  "environment_attention",
  "environment_recovered",
  "capture_received",
  "harvest_confirmed",
]

export function isCultivationEventType(value: unknown): value is CultivationEventType {
  return typeof value === "string" && (CULTIVATION_EVENT_TYPES as readonly string[]).includes(value)
}

export interface CultivationEvent {
  id: string
  type: CultivationEventType
  occurredAt: string
  provenance: Provenance
  severity?: "info" | "attention" | "critical"
  /** Stage id for stage_confirmed. */
  stage?: StageId
}

export interface StageHistoryEntry {
  stage: StageId
  confirmedAt: string
  provenance: Provenance
}

export interface CaptureMetadata {
  id: string
  capturedAt: string
  provenance: Provenance
  /** Storage object path (bucket `snapshots`). Never sent to the AI context. */
  storagePath: string
  width?: number
  height?: number
}

export interface ReadingSample {
  observedAt: string
  temperature?: number
  humidity?: number
  provenance: Provenance
}

/** Explicit memory bounds: the twin never carries an unbounded history. */
export const TWIN_LIMITS = {
  /** 24 h at one sample per 5 minutes. */
  recentReadings: 288,
  recentReadingsWindowMs: 24 * 60 * 60 * 1000,
  recentEvents: 20,
  stageHistory: 12,
} as const

export interface CultivationTwinInput {
  mode: "real" | "simulation"
  run: CultivationRun
  profile: SpeciesProfile
  latestReading: EnvironmentalReading | null
  installedCapabilities: readonly CapabilityKey[]
  recentReadings?: readonly ReadingSample[]
  recentEvents?: readonly CultivationEvent[]
  stageHistory?: readonly StageHistoryEntry[]
  latestCapture?: CaptureMetadata | null
  now: string | Date
  freshnessPolicy?: FreshnessPolicy
  /** A capture is "fresh" (camera reporting) within this window. */
  captureFreshMs?: number
}

export interface CultivationTwinSnapshot {
  generatedAt: string
  mode: "real" | "simulation"
  run: CultivationRun & { status: NonNullable<CultivationRun["status"]> }
  profile: SpeciesProfile
  organism: {
    kind: OrganismKind
    morphology: MykoMorphologyFamily
    stages: readonly StageDefinition[]
  }
  stage: {
    confirmed: { id: StageId; confirmedAt: string | null; provenance: Provenance; known: boolean }
    /** Deterministic heuristic, never a confirmation. */
    suggested: { id: StageId; provenance: "deterministic" } | null
    position: { index: number; total: number }
  }
  latestObservation: { reading: EnvironmentalReading; provenance: Provenance } | null
  freshness: GrowSnapshot["state"]["freshness"]
  capabilities: CapabilityStatus[]
  /** Deterministic evaluation + MYKO view model (existing contract, composed). */
  grow: GrowSnapshot
  memory: {
    recentReadings: ReadingSample[]
    recentEvents: CultivationEvent[]
    stageHistory: StageHistoryEntry[]
    latestCapture: CaptureMetadata | null
  }
}

const byTimeDesc = <T>(time: (item: T) => string) => (a: T, b: T) => new Date(time(b)).getTime() - new Date(time(a)).getTime()

export function buildCultivationTwin(input: CultivationTwinInput): CultivationTwinSnapshot {
  const nowMs = new Date(input.now).getTime()
  const grow = buildGrowSnapshot({
    run: input.run,
    profile: input.profile,
    reading: input.latestReading,
    now: input.now,
    freshnessPolicy: input.freshnessPolicy ?? DEFAULT_FRESHNESS_POLICY,
  })

  const stageHistory = [...(input.stageHistory ?? [])].sort(byTimeDesc((e) => e.confirmedAt)).slice(0, TWIN_LIMITS.stageHistory)
  const recentEvents = [...(input.recentEvents ?? [])].sort(byTimeDesc((e) => e.occurredAt)).slice(0, TWIN_LIMITS.recentEvents)
  const recentReadings = [...(input.recentReadings ?? [])]
    .filter((sample) => {
      const t = new Date(sample.observedAt).getTime()
      return Number.isFinite(t) && t <= nowMs && nowMs - t <= TWIN_LIMITS.recentReadingsWindowMs
    })
    .sort(byTimeDesc((s) => s.observedAt))
    .slice(0, TWIN_LIMITS.recentReadings)

  const latestCapture = input.latestCapture ?? null
  const captureAge = latestCapture ? nowMs - new Date(latestCapture.capturedAt).getTime() : Number.NaN
  const captureFresh = Number.isFinite(captureAge) && captureAge >= 0 && captureAge <= (input.captureFreshMs ?? 2 * 60 * 60 * 1000)

  const stages = profileStages(input.profile)
  const index = stageIndex(input.profile, input.run.confirmedStage)
  const lastConfirmation = stageHistory.find((entry) => entry.stage === input.run.confirmedStage)
  const simulated = input.mode === "simulation"

  return {
    generatedAt: new Date(nowMs).toISOString(),
    mode: input.mode,
    run: { ...input.run, status: input.run.status ?? "active" },
    profile: input.profile,
    organism: {
      kind: input.profile.organismKind ?? "fungus",
      morphology: input.profile.morphology ?? "fungal",
      stages,
    },
    stage: {
      confirmed: {
        id: input.run.confirmedStage,
        confirmedAt: lastConfirmation?.confirmedAt ?? input.run.stageConfirmedAt ?? null,
        provenance: simulated ? "simulation" : lastConfirmation?.provenance ?? "manual",
        known: index >= 0,
      },
      suggested: grow.state.suggestedStage ? { id: grow.state.suggestedStage, provenance: "deterministic" } : null,
      position: { index, total: stages.length },
    },
    latestObservation: input.latestReading ? { reading: input.latestReading, provenance: provenanceOfOrigin(input.latestReading.origin) } : null,
    freshness: grow.state.freshness,
    capabilities: resolveCapabilities({
      profile: input.profile,
      installed: input.installedCapabilities,
      reading: input.latestReading,
      freshness: grow.state.freshness,
      captureFresh,
    }),
    grow,
    memory: { recentReadings, recentEvents, stageHistory, latestCapture },
  }
}
