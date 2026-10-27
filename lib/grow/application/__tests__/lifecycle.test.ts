import { describe, expect, it } from "vitest"
import { SAMPLE_PLEUROTUS_OSTREATUS_PROFILE } from "@/lib/grow"
import { TEST_FIXTURE_FLOWERING_PLANT } from "../../__tests__/fixtures/flowering-plant.fixture"
import { completeCultivation, confirmCultivationStage, startCultivation, type StageConfirmationSource } from "../lifecycle"
import type { LifecycleRepository, OwnedRun } from "../types"

const NOW = "2026-09-30T12:00:00.000Z"

/** In-memory repository that enforces the DB invariant: one active run per chamber. */
function memoryRepo() {
  const chambers = new Map([["ch-1", "user-1"], ["ch-2", "user-2"]])
  const profiles = new Map([[SAMPLE_PLEUROTUS_OSTREATUS_PROFILE.id, SAMPLE_PLEUROTUS_OSTREATUS_PROFILE], [TEST_FIXTURE_FLOWERING_PLANT.id, TEST_FIXTURE_FLOWERING_PLANT]])
  const runs = new Map<string, OwnedRun>()
  const stageEvents: Array<{ runId: string; stage: string; source: string }> = []
  const runEvents: Array<{ runId: string; type: string; source: string; payload?: Record<string, unknown> }> = []
  let seq = 0
  const repository: LifecycleRepository = {
    getChamberForOwner: async (id, owner) => (chambers.get(id) === owner ? { id, ownerId: owner, name: id } : null),
    getRunForOwner: async (id, owner) => {
      const run = runs.get(id)
      return run && chambers.get(run.chamberId) === owner ? { ...run } : null
    },
    getSpeciesProfile: async (id) => profiles.get(id) ?? null,
    createRun: async (input) => {
      if ([...runs.values()].some((run) => run.chamberId === input.chamberId && run.status === "active")) return { status: "active_run_exists" }
      const id = `run-${++seq}`
      runs.set(id, { id, chamberId: input.chamberId, speciesProfileId: input.profileId, startedAt: input.startedAt, confirmedStage: input.confirmedStage, status: "active" })
      return { status: "created", runId: id }
    },
    setConfirmedStage: async (id, stage) => { runs.get(id)!.confirmedStage = stage },
    completeRun: async (id, endedAt, finalStage) => { Object.assign(runs.get(id)!, { status: "completed", endedAt, confirmedStage: finalStage }) },
    appendStageEvent: async (e) => { stageEvents.push({ runId: e.runId, stage: e.stage, source: e.source }) },
    appendRunEvent: async (e) => { runEvents.push({ runId: e.runId, type: e.type, source: e.source, payload: e.payload }) },
  }
  return { repository, runs, stageEvents, runEvents }
}

const P = SAMPLE_PLEUROTUS_OSTREATUS_PROFILE.id

describe("start cultivation", () => {
  it("starts a run with manual provenance and records stage + run events", async () => {
    const m = memoryRepo()
    const result = await startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, initialStage: "inoculation", now: NOW })
    expect(result).toEqual({ status: "started", runId: "run-1" })
    expect(m.runs.get("run-1")).toMatchObject({ status: "active", confirmedStage: "inoculation" })
    expect(m.stageEvents).toEqual([{ runId: "run-1", stage: "inoculation", source: "manual" }])
    expect(m.runEvents).toMatchObject([{ type: "cultivation_started", source: "manual" }])
  })

  it("enforces one active run per chamber through the repository invariant", async () => {
    const m = memoryRepo()
    await startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, now: NOW })
    await expect(startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, now: NOW })).resolves.toEqual({ status: "active_run_exists" })
  })

  it("never starts in someone else's chamber, with an unknown profile, or with a stage the profile lacks", async () => {
    const m = memoryRepo()
    await expect(startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-2", profileId: P, now: NOW })).resolves.toEqual({ status: "chamber_not_found" })
    await expect(startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: "nope", now: NOW })).resolves.toEqual({ status: "profile_not_found" })
    await expect(startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, initialStage: "flowering", now: NOW })).resolves.toEqual({ status: "invalid_stage" })
  })

  it("defaults to the profile's first stage (profile-driven, also for a non-fungal fixture)", async () => {
    const m = memoryRepo()
    await startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: TEST_FIXTURE_FLOWERING_PLANT.id, now: NOW })
    expect(m.runs.get("run-1")?.confirmedStage).toBe("germination")
  })
})

describe("confirm stage", () => {
  async function started() {
    const m = memoryRepo()
    await startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, initialStage: "colonization", now: NOW })
    return m
  }

  it("confirms forward, appends stage and run events, preserves provenance", async () => {
    const m = await started()
    await expect(confirmCultivationStage({ repository: m.repository, ownerId: "user-1", runId: "run-1", stage: "primordia", source: "manual", now: NOW })).resolves.toEqual({ status: "confirmed", stage: "primordia" })
    expect(m.runs.get("run-1")?.confirmedStage).toBe("primordia")
    expect(m.stageEvents.at(-1)).toEqual({ runId: "run-1", stage: "primordia", source: "manual" })
    expect(m.runEvents.at(-1)).toMatchObject({ type: "stage_confirmed", source: "manual", payload: { from: "colonization", to: "primordia" } })
  })

  it("is idempotent for a repeated confirmation (no duplicate events)", async () => {
    const m = await started()
    const before = m.stageEvents.length
    await expect(confirmCultivationStage({ repository: m.repository, ownerId: "user-1", runId: "run-1", stage: "colonization", source: "manual", now: NOW })).resolves.toEqual({ status: "unchanged", stage: "colonization" })
    expect(m.stageEvents.length).toBe(before)
  })

  it("rejects backwards transitions, unknown stages, foreign runs and inactive runs", async () => {
    const m = await started()
    await expect(confirmCultivationStage({ repository: m.repository, ownerId: "user-1", runId: "run-1", stage: "inoculation", source: "manual", now: NOW })).resolves.toMatchObject({ status: "invalid_transition" })
    await expect(confirmCultivationStage({ repository: m.repository, ownerId: "user-1", runId: "run-1", stage: "vegetative", source: "manual", now: NOW })).resolves.toEqual({ status: "invalid_stage" })
    await expect(confirmCultivationStage({ repository: m.repository, ownerId: "user-2", runId: "run-1", stage: "primordia", source: "manual", now: NOW })).resolves.toEqual({ status: "run_not_found" })
    await completeCultivation({ repository: m.repository, ownerId: "user-1", runId: "run-1", now: NOW })
    await expect(confirmCultivationStage({ repository: m.repository, ownerId: "user-1", runId: "run-1", stage: "fruiting", source: "manual", now: NOW })).resolves.toEqual({ status: "run_not_active" })
  })

  it("only a human source type can confirm a stage", () => {
    // @ts-expect-error — an AI interpretation can never be a confirmation source.
    const ai: StageConfirmationSource = "ai_supervisor"
    // @ts-expect-error — nor can a vision model on its own.
    const vision: StageConfirmationSource = "vision_model"
    expect([ai, vision]).toHaveLength(2)
  })
})

describe("complete / harvest", () => {
  it("completes with grounded facts only (no invented yield)", async () => {
    const m = memoryRepo()
    await startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, initialStage: "fruiting", now: NOW })
    await expect(completeCultivation({ repository: m.repository, ownerId: "user-1", runId: "run-1", finalStage: "harvest", now: NOW })).resolves.toEqual({ status: "completed", finalStage: "harvest" })
    expect(m.runs.get("run-1")).toMatchObject({ status: "completed", confirmedStage: "harvest", endedAt: NOW })
    const harvest = m.runEvents.find((e) => e.type === "harvest_confirmed")
    expect(harvest?.payload).toEqual({ finalStage: "harvest" })
    expect(m.stageEvents.at(-1)).toEqual({ runId: "run-1", stage: "harvest", source: "manual" })
  })

  it("stores entered yield/notes, validates them, and frees the chamber for a new run", async () => {
    const m = memoryRepo()
    await startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, initialStage: "harvest", now: NOW })
    await expect(completeCultivation({ repository: m.repository, ownerId: "user-1", runId: "run-1", facts: { yieldGrams: -3 }, now: NOW })).resolves.toMatchObject({ status: "invalid_facts" })
    await completeCultivation({ repository: m.repository, ownerId: "user-1", runId: "run-1", facts: { yieldGrams: 412.5, notes: " good flush " }, now: NOW })
    expect(m.runEvents.find((e) => e.type === "harvest_confirmed")?.payload).toEqual({ finalStage: "harvest", yieldGrams: 412.5, notes: "good flush" })
    await expect(completeCultivation({ repository: m.repository, ownerId: "user-1", runId: "run-1", now: NOW })).resolves.toEqual({ status: "run_not_active" })
    await expect(startCultivation({ repository: m.repository, ownerId: "user-1", chamberId: "ch-1", profileId: P, now: NOW })).resolves.toMatchObject({ status: "started" })
  })
})
