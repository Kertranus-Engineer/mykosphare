import type { CapabilityKey, CultivationRun, EnvironmentalReading, Provenance, SpeciesProfile, StageId } from "../types"
import type { CaptureMetadata, CultivationEvent, CultivationTwinSnapshot, ReadingSample, StageHistoryEntry } from "../twin"

export interface GrowChamber { id: string; ownerId: string; name: string }

/** Read side used to build snapshots and twins. Ownership is always resolved server-side. */
export interface GrowRepository {
  getChamberForOwner(chamberId: string, ownerId: string): Promise<GrowChamber | null>
  getActiveRun(chamberId: string): Promise<CultivationRun | null>
  getSpeciesProfile(profileId: string): Promise<SpeciesProfile | null>
  getLatestReading(chamberId: string): Promise<EnvironmentalReading | null>
}

/** Bounded memory reads for the twin. Every method takes an explicit limit. */
export interface TwinRepository extends GrowRepository {
  getInstalledCapabilities(chamberId: string): Promise<CapabilityKey[]>
  getRecentReadings(runId: string, sinceIso: string, limit: number): Promise<ReadingSample[]>
  getRecentEvents(runId: string, limit: number): Promise<CultivationEvent[]>
  getStageHistory(runId: string, limit: number): Promise<StageHistoryEntry[]>
  getLatestCapture(runId: string): Promise<CaptureMetadata | null>
}

export type GrowSnapshotResult =
  | { status: "ready"; snapshot: import("../types").GrowSnapshot }
  | { status: "not_found" }
  | { status: "no_active_run" }
  | { status: "profile_missing" }
  | { status: "unavailable" }

export type CultivationTwinResult =
  | { status: "ready"; twin: CultivationTwinSnapshot }
  | { status: "not_found" }
  | { status: "no_active_run" }
  | { status: "profile_missing" }
  | { status: "unavailable" }

/** A run as the lifecycle sees it, with ownership already resolved. */
export interface OwnedRun extends CultivationRun {
  chamberId: string
  status: NonNullable<CultivationRun["status"]>
}

/**
 * Write side for lifecycle operations. Implementations must enforce the DB
 * invariant "one active run per chamber" (partial unique index) and report it
 * as `active_run_exists` instead of throwing.
 */
export interface LifecycleRepository {
  getChamberForOwner(chamberId: string, ownerId: string): Promise<GrowChamber | null>
  getRunForOwner(runId: string, ownerId: string): Promise<OwnedRun | null>
  getSpeciesProfile(profileId: string): Promise<SpeciesProfile | null>
  createRun(input: { chamberId: string; profileId: string; name: string; startedAt: string; confirmedStage: StageId }): Promise<{ status: "created"; runId: string } | { status: "active_run_exists" }>
  setConfirmedStage(runId: string, stage: StageId): Promise<void>
  completeRun(runId: string, endedAt: string, finalStage: StageId): Promise<void>
  appendStageEvent(input: { runId: string; stage: StageId; confirmedAt: string; source: Provenance; actorId: string | null }): Promise<void>
  appendRunEvent(input: { runId: string; type: CultivationEvent["type"]; occurredAt: string; source: Provenance; actorId: string | null; severity?: CultivationEvent["severity"]; payload?: Record<string, unknown> }): Promise<void>
}
