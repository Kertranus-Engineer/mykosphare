import type { CultivationRun, EnvironmentalReading, SpeciesProfile } from "../types"

export interface GrowChamber { id: string; ownerId: string; name: string }
export interface GrowRepository {
  getChamberForOwner(chamberId: string, ownerId: string): Promise<GrowChamber | null>
  getActiveRun(chamberId: string): Promise<CultivationRun | null>
  getSpeciesProfile(profileId: string): Promise<SpeciesProfile | null>
  getLatestReading(chamberId: string): Promise<EnvironmentalReading | null>
}

export type GrowSnapshotResult =
  | { status: "ready"; snapshot: import("../types").GrowSnapshot }
  | { status: "not_found" }
  | { status: "no_active_run" }
  | { status: "profile_missing" }
  | { status: "unavailable" }
