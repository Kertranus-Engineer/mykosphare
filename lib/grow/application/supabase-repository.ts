import { createAdminClient } from "@/lib/supabase/admin"
import type { GrowthStage, SpeciesProfile } from "../types"
import type { GrowRepository } from "./types"

const stages: GrowthStage[] = ["inoculation", "colonization", "consolidation", "primordia", "fruiting", "harvest"]
function isStage(value: unknown): value is GrowthStage { return typeof value === "string" && stages.includes(value as GrowthStage) }

/** Database adapter; DB rows intentionally remain separate from Grow Domain types. */
export function createSupabaseGrowRepository(): GrowRepository {
  const db = createAdminClient()
  return {
    async getChamberForOwner(id, ownerId) {
      const { data, error } = await db.from("grow_chambers").select("id, owner_id, name").eq("id", id).eq("owner_id", ownerId).maybeSingle()
      if (error) throw error
      return data ? { id: data.id, ownerId: data.owner_id, name: data.name } : null
    },
    async getActiveRun(chamberId) {
      const { data, error } = await db.from("grow_cultivation_runs").select("id, species_profile_id, started_at, confirmed_stage").eq("chamber_id", chamberId).eq("status", "active").maybeSingle()
      if (error) throw error
      if (!data || !isStage(data.confirmed_stage)) return null
      return { id: data.id, speciesProfileId: data.species_profile_id, startedAt: data.started_at, confirmedStage: data.confirmed_stage }
    },
    async getSpeciesProfile(id) {
      const { data, error } = await db.from("grow_species_profiles").select("id, species, display_name, validation_status, stage_targets").eq("id", id).maybeSingle()
      if (error) throw error
      if (!data || (data.validation_status !== "sample" && data.validation_status !== "validated")) return null
      return { id: data.id, scientificName: data.species, commonName: data.display_name, kind: data.validation_status, stageTargets: data.stage_targets as SpeciesProfile["stageTargets"] }
    },
    async getLatestReading(chamberId) {
      const { data, error } = await db.from("grow_readings").select("observed_at, origin, temperature, humidity, grow_devices!inner(hardware_identifier)").eq("chamber_id", chamberId).order("observed_at", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data || (data.origin !== "real" && data.origin !== "simulated")) return null
      return { timestamp: data.observed_at, origin: data.origin, source: "grow-readings", deviceId: (data.grow_devices as unknown as { hardware_identifier: string }).hardware_identifier, ...(data.temperature !== null ? { temperature: Number(data.temperature) } : {}), ...(data.humidity !== null ? { humidity: Number(data.humidity) } : {}) }
    },
  }
}
