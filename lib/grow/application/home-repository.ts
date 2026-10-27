import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { GROW_STAGE_ORDER } from "../presentation/stage"
import type { HomeCultivation, HomeProfile, HomeRange, HomeReading, HomeRepository, HomeTargets, HomeValidation } from "./home-read"

const BUCKET_MS = 5 * 60_000
const PAGE = 1000
const MAX_PAGES = 4

const isRange = (v: unknown): v is HomeRange => {
  const r = v as Record<string, unknown> | null
  return !!r && typeof r.min === "number" && typeof r.max === "number" && r.min < r.max
}
/** jsonb does not keep key order, so known stages follow the lifecycle order and any custom ones come after. */
function stagesOf(stageTargets: unknown): string[] {
  if (!stageTargets || typeof stageTargets !== "object") return []
  const known: readonly string[] = GROW_STAGE_ORDER
  const keys = Object.keys(stageTargets as object)
  return [...keys.filter(k => known.includes(k)).sort((a, b) => known.indexOf(a) - known.indexOf(b)), ...keys.filter(k => !known.includes(k))]
}
function targetsOf(stageTargets: unknown, stage: string): HomeTargets | null {
  const entry = (stageTargets as Record<string, Record<string, unknown>> | null)?.[stage]
  if (!entry) return null
  const targets: HomeTargets = {}
  if (isRange(entry.temperature)) targets.temperature = entry.temperature
  if (isRange(entry.humidity)) targets.humidity = entry.humidity
  return targets.temperature || targets.humidity ? targets : null
}
const validation = (v: unknown): HomeValidation => v === "validated" || v === "experimental" ? v : "sample"
const num = (v: unknown) => v === null || v === undefined ? null : Number(v)

/** User session + RLS + explicit owner scoping. No administrative client. */
export function createHomeRepository(db: SupabaseClient): HomeRepository {
  return {
    async findOwnedChamber(ownerId, chamberId) {
      let query = db.from("grow_chambers").select("id,name").eq("owner_id", ownerId)
      if (chamberId) query = query.eq("id", chamberId)
      const { data, error } = await query.order("created_at").order("id").limit(1).maybeSingle()
      if (error) throw error
      return data
    },
    async findDevice(chamberId) {
      const { data, error } = await db.from("grow_devices").select("id,name,enabled,last_seen_at").eq("chamber_id", chamberId).eq("device_type", "controller").order("created_at").order("id").limit(1).maybeSingle()
      if (error) throw error
      return data ? { id: data.id, name: data.name, enabled: data.enabled, lastSeenAt: data.last_seen_at } : null
    },
    async readings(chamberId, deviceId) {
      const { data, error } = await db.from("grow_readings").select("observed_at,temperature,humidity").eq("chamber_id", chamberId).eq("device_id", deviceId).eq("origin", "real").order("observed_at", { ascending: false }).limit(120)
      if (error) throw error
      return (data ?? []).map(row => ({ observedAt: row.observed_at, temperature: num(row.temperature), humidity: num(row.humidity) }))
    },
    /** PostgREST caps a page at 1000 rows, so page through 24 h (~2900 rows at 30 s) and average per 5 minutes. */
    async history(chamberId, deviceId, sinceIso) {
      const buckets = new Map<number, { t: number[]; h: number[] }>()
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await db.from("grow_readings").select("observed_at,temperature,humidity").eq("chamber_id", chamberId).eq("device_id", deviceId).eq("origin", "real").gte("observed_at", sinceIso).order("observed_at", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1)
        if (error) throw error
        for (const row of data ?? []) {
          const key = Math.floor(Date.parse(row.observed_at) / BUCKET_MS) * BUCKET_MS
          const bucket = buckets.get(key) ?? { t: [], h: [] }
          if (row.temperature !== null) bucket.t.push(Number(row.temperature))
          if (row.humidity !== null) bucket.h.push(Number(row.humidity))
          buckets.set(key, bucket)
        }
        if ((data?.length ?? 0) < PAGE) break
      }
      const avg = (xs: number[]) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null
      return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map<HomeReading>(([key, b]) => ({ observedAt: new Date(key + BUCKET_MS / 2).toISOString(), temperature: avg(b.t), humidity: avg(b.h) }))
    },
    async activeCultivation(chamberId): Promise<HomeCultivation | null> {
      const { data, error } = await db.from("grow_cultivation_runs").select("id,name,started_at,confirmed_stage,grow_species_profiles(id,display_name,species,validation_status,stage_targets,metadata)").eq("chamber_id", chamberId).eq("status", "active").limit(1).maybeSingle()
      if (error) throw error
      if (!data) return null
      const profile = Array.isArray(data.grow_species_profiles) ? data.grow_species_profiles[0] : data.grow_species_profiles
      if (!profile) return null
      return {
        runId: data.id, name: data.name, startedAt: data.started_at, stage: String(data.confirmed_stage),
        profile: { id: profile.id, displayName: profile.display_name, species: profile.species, validation: validation(profile.validation_status), stages: stagesOf(profile.stage_targets) },
        targets: targetsOf(profile.stage_targets, String(data.confirmed_stage)),
        rangesSource: profile.metadata?.custom === true ? "owner" : "profile",
        targetsConfirmed: profile.metadata?.confirmed_by_owner === true,
      }
    },
    async profiles() {
      // Per-owner custom range profiles live in the same table; they are not part of the public catalog.
      const { data, error } = await db.from("grow_species_profiles").select("id,display_name,species,validation_status,stage_targets,metadata").order("display_name").limit(40)
      if (error) throw error
      return (data ?? []).filter(p => p.metadata?.custom !== true).map<HomeProfile>(p => {
        const stages = stagesOf(p.stage_targets)
        return { id: p.id, displayName: p.display_name, species: p.species, validation: validation(p.validation_status), stages, example: stages[0] ? targetsOf(p.stage_targets, stages[0]) : null }
      })
    },
  }
}
