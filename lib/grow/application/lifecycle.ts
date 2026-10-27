import { findStage, profileStages, stageIndex } from "../stages"
import type { StageId } from "../types"
import type { LifecycleRepository } from "./types"

/**
 * Cultivation lifecycle: active → completed. Pure application logic over a
 * repository; route handlers only authenticate, validate and map results.
 *
 * Invariants:
 * - ownership is resolved server-side (chamber/run → owner); ids sent by a
 *   client are never trusted on their own;
 * - one active run per chamber is the DB's partial unique index, surfaced as
 *   `active_run_exists` (not re-implemented here as a racy pre-check);
 * - a stage is confirmed only by a HUMAN (`manual`). The type does not admit
 *   AI or vision as a confirmation source: a future vision suggestion becomes
 *   a confirmation only when a person confirms it;
 * - completion never invents yield: optional facts are stored only if given.
 */

/** Sources allowed to CONFIRM a stage. Deliberately excludes ai_supervisor / vision_model. */
export type StageConfirmationSource = "manual"

export type StartCultivationResult =
  | { status: "started"; runId: string }
  | { status: "chamber_not_found" }
  | { status: "profile_not_found" }
  | { status: "invalid_stage" }
  | { status: "active_run_exists" }

export async function startCultivation(input: {
  repository: LifecycleRepository
  ownerId: string
  chamberId: string
  profileId: string
  initialStage?: StageId
  name?: string
  now: string | Date
}): Promise<StartCultivationResult> {
  const repo = input.repository
  const chamber = await repo.getChamberForOwner(input.chamberId, input.ownerId)
  if (!chamber) return { status: "chamber_not_found" }
  const profile = await repo.getSpeciesProfile(input.profileId)
  if (!profile) return { status: "profile_not_found" }
  const stage = input.initialStage ?? profileStages(profile)[0]?.id
  if (!stage || !findStage(profile, stage)) return { status: "invalid_stage" }

  const at = new Date(input.now).toISOString()
  const created = await repo.createRun({
    chamberId: chamber.id,
    profileId: profile.id,
    name: (input.name?.trim() || `${profile.commonName} · ${at.slice(0, 10)}`).slice(0, 120),
    startedAt: at,
    confirmedStage: stage,
  })
  if (created.status === "active_run_exists") return created
  await repo.appendStageEvent({ runId: created.runId, stage, confirmedAt: at, source: "manual", actorId: input.ownerId })
  await repo.appendRunEvent({ runId: created.runId, type: "cultivation_started", occurredAt: at, source: "manual", actorId: input.ownerId, severity: "info", payload: { stage } })
  return { status: "started", runId: created.runId }
}

export type ConfirmStageResult =
  | { status: "confirmed"; stage: StageId }
  | { status: "unchanged"; stage: StageId }
  | { status: "run_not_found" }
  | { status: "run_not_active" }
  | { status: "invalid_stage" }
  | { status: "invalid_transition"; from: StageId; to: StageId }

export async function confirmCultivationStage(input: {
  repository: LifecycleRepository
  ownerId: string
  runId: string
  stage: StageId
  source: StageConfirmationSource
  now: string | Date
}): Promise<ConfirmStageResult> {
  const repo = input.repository
  const run = await repo.getRunForOwner(input.runId, input.ownerId)
  if (!run) return { status: "run_not_found" }
  if (run.status !== "active") return { status: "run_not_active" }
  const profile = await repo.getSpeciesProfile(run.speciesProfileId)
  if (!profile || !findStage(profile, input.stage)) return { status: "invalid_stage" }

  // Idempotent: confirming the current stage again records nothing new.
  if (run.confirmedStage === input.stage) return { status: "unchanged", stage: input.stage }
  // Forward-only (skipping allowed). Corrections backwards are a future, explicitly audited operation.
  const from = stageIndex(profile, run.confirmedStage)
  const to = stageIndex(profile, input.stage)
  if (from >= 0 && to < from) return { status: "invalid_transition", from: run.confirmedStage, to: input.stage }

  const at = new Date(input.now).toISOString()
  await repo.setConfirmedStage(run.id, input.stage)
  await repo.appendStageEvent({ runId: run.id, stage: input.stage, confirmedAt: at, source: input.source, actorId: input.ownerId })
  await repo.appendRunEvent({ runId: run.id, type: "stage_confirmed", occurredAt: at, source: input.source, actorId: input.ownerId, severity: "info", payload: { from: run.confirmedStage, to: input.stage } })
  return { status: "confirmed", stage: input.stage }
}

export interface HarvestFacts {
  /** Only if the grower actually weighed it. Never estimated. */
  yieldGrams?: number
  notes?: string
}

export type CompleteCultivationResult =
  | { status: "completed"; finalStage: StageId }
  | { status: "run_not_found" }
  | { status: "run_not_active" }
  | { status: "invalid_stage" }
  | { status: "invalid_facts"; error: string }

export async function completeCultivation(input: {
  repository: LifecycleRepository
  ownerId: string
  runId: string
  finalStage?: StageId
  facts?: HarvestFacts
  now: string | Date
}): Promise<CompleteCultivationResult> {
  const repo = input.repository
  const run = await repo.getRunForOwner(input.runId, input.ownerId)
  if (!run) return { status: "run_not_found" }
  if (run.status !== "active") return { status: "run_not_active" }
  const profile = await repo.getSpeciesProfile(run.speciesProfileId)
  const finalStage = input.finalStage ?? run.confirmedStage
  if (!profile || !findStage(profile, finalStage)) return { status: "invalid_stage" }
  const current = stageIndex(profile, run.confirmedStage)
  if (current >= 0 && stageIndex(profile, finalStage) < current) return { status: "invalid_stage" }

  const payload: Record<string, unknown> = { finalStage }
  if (input.facts?.yieldGrams !== undefined) {
    const grams = input.facts.yieldGrams
    if (typeof grams !== "number" || !Number.isFinite(grams) || grams < 0 || grams > 1_000_000) return { status: "invalid_facts", error: "yieldGrams must be a non-negative number" }
    payload.yieldGrams = grams
  }
  if (input.facts?.notes !== undefined) {
    if (typeof input.facts.notes !== "string" || input.facts.notes.length > 1000) return { status: "invalid_facts", error: "notes must be text up to 1000 characters" }
    if (input.facts.notes.trim()) payload.notes = input.facts.notes.trim()
  }

  const at = new Date(input.now).toISOString()
  if (finalStage !== run.confirmedStage) {
    await repo.appendStageEvent({ runId: run.id, stage: finalStage, confirmedAt: at, source: "manual", actorId: input.ownerId })
  }
  await repo.completeRun(run.id, at, finalStage)
  await repo.appendRunEvent({ runId: run.id, type: "harvest_confirmed", occurredAt: at, source: "manual", actorId: input.ownerId, severity: "info", payload })
  return { status: "completed", finalStage }
}
