import { buildGrowSnapshot } from "../snapshot"
import { createSampleSimulationReading } from "../simulation"
import { buildCultivationTwin, TWIN_LIMITS } from "../twin"
import type { CultivationTwinResult, GrowRepository, GrowSnapshotResult, TwinRepository } from "./types"

export async function getGrowSnapshot(input: {
  repository: GrowRepository
  chamberId: string
  ownerId: string
  now: string | Date
  mode?: "real" | "simulation"
}): Promise<GrowSnapshotResult> {
  try {
    const chamber = await input.repository.getChamberForOwner(input.chamberId, input.ownerId)
    if (!chamber) return { status: "not_found" }
    const run = await input.repository.getActiveRun(chamber.id)
    if (!run) return { status: "no_active_run" }
    const profile = await input.repository.getSpeciesProfile(run.speciesProfileId)
    if (!profile) return { status: "profile_missing" }
    const reading = input.mode === "simulation"
      ? createSampleSimulationReading({ scenario: "stable", now: input.now, deviceId: "simulation" })
      : await input.repository.getLatestReading(chamber.id)
    return { status: "ready", snapshot: buildGrowSnapshot({ run, profile, reading, now: input.now }) }
  } catch {
    return { status: "unavailable" }
  }
}

/**
 * The primary read model of a cultivation. Real mode reads only persisted
 * observations (no fallback to simulation: missing data stays missing).
 * Simulation mode is explicit, synthesises only the reading and carries NO
 * persisted memory, so nothing simulated can be mistaken for history.
 */
export async function getCultivationTwin(input: {
  repository: TwinRepository
  chamberId: string
  ownerId: string
  now: string | Date
  mode?: "real" | "simulation"
}): Promise<CultivationTwinResult> {
  try {
    const chamber = await input.repository.getChamberForOwner(input.chamberId, input.ownerId)
    if (!chamber) return { status: "not_found" }
    const run = await input.repository.getActiveRun(chamber.id)
    if (!run) return { status: "no_active_run" }
    const profile = await input.repository.getSpeciesProfile(run.speciesProfileId)
    if (!profile) return { status: "profile_missing" }

    if (input.mode === "simulation") {
      return {
        status: "ready",
        twin: buildCultivationTwin({
          mode: "simulation",
          run,
          profile,
          latestReading: createSampleSimulationReading({ scenario: "stable", now: input.now, deviceId: "simulation" }),
          installedCapabilities: ["temperature", "humidity"],
          now: input.now,
        }),
      }
    }

    const since = new Date(new Date(input.now).getTime() - TWIN_LIMITS.recentReadingsWindowMs).toISOString()
    const [latestReading, installedCapabilities, recentReadings, recentEvents, stageHistory, latestCapture] = await Promise.all([
      input.repository.getLatestReading(chamber.id),
      input.repository.getInstalledCapabilities(chamber.id),
      input.repository.getRecentReadings(run.id, since, TWIN_LIMITS.recentReadings),
      input.repository.getRecentEvents(run.id, TWIN_LIMITS.recentEvents),
      input.repository.getStageHistory(run.id, TWIN_LIMITS.stageHistory),
      input.repository.getLatestCapture(run.id),
    ])
    return {
      status: "ready",
      twin: buildCultivationTwin({ mode: "real", run, profile, latestReading, installedCapabilities, recentReadings, recentEvents, stageHistory, latestCapture, now: input.now }),
    }
  } catch {
    return { status: "unavailable" }
  }
}
