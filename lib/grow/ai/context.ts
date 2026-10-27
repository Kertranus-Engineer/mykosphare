import type { CultivationTwinSnapshot } from "../twin"
import type { CapabilityKey, MetricTarget, Provenance, StageId } from "../types"

/**
 * AI SUPERVISOR — INPUT SEAM (no model is called in this milestone).
 *
 * `projectAiCultivationContext` is a PURE projection from the cultivation twin
 * into a small, structured, ALLOW-LISTED context. It is built field by field
 * (never by spreading the twin) so nothing else can leak: no credentials, no
 * device keys or hashes, no owner/user ids, no hardware identifiers, no storage
 * paths, no database rows. The AI receives facts with provenance and evidence
 * references; it receives no write capability of any kind.
 */

/** Stable references the AI must cite for every claim. */
export type EvidenceRef =
  | `reading:${string}`
  | `event:${string}`
  | `stage:confirmed`
  | `stage:suggested`
  | `capture:${string}`
  | `capability:${CapabilityKey}`
  | `target:${string}`

export interface AiObservation {
  capability: CapabilityKey
  /** null = not observed. Never 0 for missing data. */
  value: number | null
  unit: string | null
  observedAt: string | null
  provenance: Provenance | null
  evidence: EvidenceRef
}

export interface AiCultivationContext {
  schemaVersion: 1
  generatedAt: string
  mode: "real" | "simulation"
  organism: { commonName: string; scientificName: string; kind: string; profileValidation: "sample" | "validated" }
  stage: {
    confirmed: { id: StageId; confirmedAt: string | null; provenance: Provenance }
    /** A heuristic, explicitly NOT a confirmation. */
    suggested: { id: StageId; provenance: "deterministic" } | null
    declaredStages: StageId[]
  }
  age: { cultivationDay: number | null; startedAt: string }
  freshness: CultivationTwinSnapshot["freshness"]
  health: CultivationTwinSnapshot["grow"]["state"]["health"]
  dataStatus: CultivationTwinSnapshot["grow"]["state"]["dataStatus"]
  observations: AiObservation[]
  /** Supported by the organism but not installed or not reporting. */
  missingCapabilities: { capability: CapabilityKey; reason: "not_installed" | "not_reporting" }[]
  targets: { temperature: MetricTarget | null; humidity: MetricTarget | null; evidence: EvidenceRef }
  needs: { kind: string; severity: string; metric?: string }[]
  trend: { window: "24h"; samples: number; temperature: TrendSummary | null; humidity: TrendSummary | null }
  recentEvents: { type: string; occurredAt: string; provenance: Provenance; stage?: StageId; evidence: EvidenceRef }[]
  latestCapture: { capturedAt: string; provenance: Provenance; evidence: EvidenceRef } | null
}

export interface TrendSummary {
  min: number
  max: number
  first: number
  last: number
}

/** Day 1 = first 24 h since start; null when invalid or in the future. */
function cultivationDay(startedAt: string, at: string): number | null {
  const start = new Date(startedAt).getTime()
  const ref = new Date(at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(ref) || ref < start) return null
  return Math.floor((ref - start) / (24 * 60 * 60 * 1000)) + 1
}

function trend(values: { observedAt: string; value: number | undefined }[]): TrendSummary | null {
  const points = values.filter((p): p is { observedAt: string; value: number } => typeof p.value === "number" && Number.isFinite(p.value))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime())
  if (points.length === 0) return null
  const nums = points.map((p) => p.value)
  return { min: Math.min(...nums), max: Math.max(...nums), first: nums[0], last: nums[nums.length - 1] }
}

export function projectAiCultivationContext(twin: CultivationTwinSnapshot): AiCultivationContext {
  const latest = twin.latestObservation
  const stageTargets = twin.profile.stageTargets[twin.run.confirmedStage]
  const readings = twin.memory.recentReadings

  return {
    schemaVersion: 1,
    generatedAt: twin.generatedAt,
    mode: twin.mode,
    organism: {
      commonName: twin.profile.commonName,
      scientificName: twin.profile.scientificName,
      kind: twin.organism.kind,
      profileValidation: twin.profile.kind,
    },
    stage: {
      confirmed: { id: twin.stage.confirmed.id, confirmedAt: twin.stage.confirmed.confirmedAt, provenance: twin.stage.confirmed.provenance },
      suggested: twin.stage.suggested ? { id: twin.stage.suggested.id, provenance: "deterministic" } : null,
      declaredStages: twin.organism.stages.map((stage) => stage.id),
    },
    age: { cultivationDay: cultivationDay(twin.run.startedAt, twin.generatedAt), startedAt: twin.run.startedAt },
    freshness: twin.freshness,
    health: twin.grow.state.health,
    dataStatus: twin.grow.state.dataStatus,
    observations: twin.capabilities
      .filter((capability) => capability.installed)
      .map((capability) => ({
        capability: capability.key,
        value: capability.value,
        unit: capability.unit,
        observedAt: capability.observed && latest ? latest.reading.timestamp : null,
        provenance: capability.observed && latest ? latest.provenance : null,
        evidence: capability.observed && latest ? (`reading:${latest.reading.timestamp}` as const) : (`capability:${capability.key}` as const),
      })),
    missingCapabilities: twin.capabilities
      .filter((capability) => capability.supported && !capability.available)
      .map((capability) => ({ capability: capability.key, reason: capability.installed ? "not_reporting" as const : "not_installed" as const })),
    targets: {
      temperature: stageTargets?.temperature ?? null,
      humidity: stageTargets?.humidity ?? null,
      evidence: `target:${twin.profile.id}/${twin.run.confirmedStage}`,
    },
    needs: twin.grow.state.needs.map((need) => ({ kind: need.kind, severity: need.severity, ...(need.metric ? { metric: need.metric } : {}) })),
    trend: {
      window: "24h",
      samples: readings.length,
      temperature: trend(readings.map((r) => ({ observedAt: r.observedAt, value: r.temperature }))),
      humidity: trend(readings.map((r) => ({ observedAt: r.observedAt, value: r.humidity }))),
    },
    recentEvents: twin.memory.recentEvents.map((event) => ({
      type: event.type,
      occurredAt: event.occurredAt,
      provenance: event.provenance,
      ...(event.stage ? { stage: event.stage } : {}),
      evidence: `event:${event.id}` as const,
    })),
    latestCapture: twin.memory.latestCapture
      ? { capturedAt: twin.memory.latestCapture.capturedAt, provenance: twin.memory.latestCapture.provenance, evidence: `capture:${twin.memory.latestCapture.id}` as const }
      : null,
  }
}
