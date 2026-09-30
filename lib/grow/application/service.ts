import { buildGrowSnapshot } from "../snapshot"
import { createSampleSimulationReading } from "../simulation"
import type { GrowRepository, GrowSnapshotResult } from "./types"

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
