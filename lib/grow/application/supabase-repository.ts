import { createAdminClient } from "@/lib/supabase/admin"
import { chamberInstalledCapabilities, isCapabilityKey } from "../capabilities"
import { isCultivationEventType, type CaptureMetadata, type CultivationEvent, type ReadingSample, type StageHistoryEntry } from "../twin"
import type { CapabilityKey, MykoForm, MykoMorphologyFamily, OrganismKind, Provenance, SpeciesProfile, StageDefinition } from "../types"
import type { IngestionStore } from "./ingestion"
import type { LifecycleRepository, OwnedRun, TwinRepository } from "./types"

/**
 * Database adapter (server-only, service role). DB rows intentionally remain
 * separate from Grow Domain types. Ownership is ALWAYS checked here through the
 * chamber's owner_id before any read or write that a user requested.
 */

const MYKO_FORMS: readonly MykoForm[] = ["early", "emerging", "mature", "complete"]
const ORGANISM_KINDS: readonly OrganismKind[] = ["fungus", "plant", "flowering_plant"]
const MORPHOLOGIES: readonly MykoMorphologyFamily[] = ["fungal", "plant", "flowering_plant"]
const PROVENANCES: readonly Provenance[] = ["sensor", "simulation", "manual", "vision_model", "ai_supervisor", "deterministic"]

function provenance(value: unknown, fallback: Provenance): Provenance {
  return typeof value === "string" && (PROVENANCES as readonly string[]).includes(value) ? (value as Provenance) : fallback
}

/** Parses declared stages; `undefined` = not declared (fungal default), `null` = malformed. */
function parseStages(value: unknown): readonly StageDefinition[] | undefined | null {
  if (value === null || value === undefined) return undefined
  if (!Array.isArray(value) || value.length === 0) return null
  const stages: StageDefinition[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null
    const { id, label, mykoForm, suggestFromDay } = entry as Record<string, unknown>
    if (typeof id !== "string" || !id || !MYKO_FORMS.includes(mykoForm as MykoForm)) return null
    stages.push({
      id,
      mykoForm: mykoForm as MykoForm,
      ...(typeof label === "string" ? { label } : {}),
      ...(typeof suggestFromDay === "number" && Number.isFinite(suggestFromDay) ? { suggestFromDay } : {}),
    })
  }
  return stages
}

interface ProfileRow {
  id: string
  species: string
  display_name: string
  validation_status: string
  stage_targets: unknown
  organism_kind: string | null
  morphology: string | null
  stages: unknown
  capabilities: string[] | null
}

function toProfile(row: ProfileRow): SpeciesProfile | null {
  if (row.validation_status !== "sample" && row.validation_status !== "validated") return null
  const stages = parseStages(row.stages)
  if (stages === null) return null
  return {
    id: row.id,
    scientificName: row.species,
    commonName: row.display_name,
    kind: row.validation_status,
    stageTargets: row.stage_targets as SpeciesProfile["stageTargets"],
    ...(row.organism_kind && (ORGANISM_KINDS as readonly string[]).includes(row.organism_kind) ? { organismKind: row.organism_kind as OrganismKind } : {}),
    ...(row.morphology && (MORPHOLOGIES as readonly string[]).includes(row.morphology) ? { morphology: row.morphology as MykoMorphologyFamily } : {}),
    ...(stages ? { stages } : {}),
    ...(row.capabilities ? { capabilities: row.capabilities.filter(isCapabilityKey) as CapabilityKey[] } : {}),
  }
}

const PROFILE_COLUMNS = "id, species, display_name, validation_status, stage_targets, organism_kind, morphology, stages, capabilities"

export function createSupabaseGrowRepository(): TwinRepository & LifecycleRepository {
  const db = createAdminClient()

  async function latestStageConfirmation(runId: string): Promise<string | undefined> {
    const { data, error } = await db.from("grow_stage_events").select("confirmed_at").eq("run_id", runId).order("confirmed_at", { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return data?.confirmed_at ?? undefined
  }

  async function getSpeciesProfile(id: string) {
    const { data, error } = await db.from("grow_species_profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle()
    if (error) throw error
    return data ? toProfile(data as ProfileRow) : null
  }

  async function getChamberForOwner(id: string, ownerId: string) {
    const { data, error } = await db.from("grow_chambers").select("id, owner_id, name").eq("id", id).eq("owner_id", ownerId).maybeSingle()
    if (error) throw error
    return data ? { id: data.id, ownerId: data.owner_id, name: data.name } : null
  }

  return {
    getChamberForOwner,
    getSpeciesProfile,

    async getActiveRun(chamberId) {
      const { data, error } = await db.from("grow_cultivation_runs").select("id, species_profile_id, started_at, confirmed_stage, status").eq("chamber_id", chamberId).eq("status", "active").maybeSingle()
      if (error) throw error
      if (!data || typeof data.confirmed_stage !== "string") return null
      const stageConfirmedAt = await latestStageConfirmation(data.id)
      return { id: data.id, speciesProfileId: data.species_profile_id, startedAt: data.started_at, confirmedStage: data.confirmed_stage, status: "active", ...(stageConfirmedAt ? { stageConfirmedAt } : {}) }
    },

    async getLatestReading(chamberId) {
      const { data, error } = await db.from("grow_readings").select("observed_at, origin, temperature, humidity, grow_devices!inner(hardware_identifier)").eq("chamber_id", chamberId).order("observed_at", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data || (data.origin !== "real" && data.origin !== "simulated")) return null
      return { timestamp: data.observed_at, origin: data.origin, source: "grow-readings", deviceId: (data.grow_devices as unknown as { hardware_identifier: string }).hardware_identifier, ...(data.temperature !== null ? { temperature: Number(data.temperature) } : {}), ...(data.humidity !== null ? { humidity: Number(data.humidity) } : {}) }
    },

    async getInstalledCapabilities(chamberId) {
      const { data, error } = await db.from("grow_devices").select("capabilities, enabled").eq("chamber_id", chamberId)
      if (error) throw error
      return chamberInstalledCapabilities((data ?? []).map((row) => ({ capabilities: (row.capabilities as string[] | null) ?? [], enabled: row.enabled as boolean })))
    },

    async getRecentReadings(runId, sinceIso, limit) {
      const { data, error } = await db.from("grow_readings").select("observed_at, origin, temperature, humidity").eq("run_id", runId).gte("observed_at", sinceIso).order("observed_at", { ascending: false }).limit(limit)
      if (error) throw error
      return (data ?? []).map((row): ReadingSample => ({
        observedAt: row.observed_at,
        provenance: row.origin === "real" ? "sensor" : "simulation",
        ...(row.temperature !== null ? { temperature: Number(row.temperature) } : {}),
        ...(row.humidity !== null ? { humidity: Number(row.humidity) } : {}),
      }))
    },

    async getRecentEvents(runId, limit) {
      const { data, error } = await db.from("grow_run_events").select("id, type, occurred_at, source, severity, payload").eq("run_id", runId).order("occurred_at", { ascending: false }).limit(limit)
      if (error) throw error
      return (data ?? []).filter((row) => isCultivationEventType(row.type)).map((row): CultivationEvent => {
        const payload = (row.payload ?? {}) as Record<string, unknown>
        const stage = typeof payload.to === "string" ? payload.to : typeof payload.stage === "string" ? payload.stage : undefined
        return {
          id: row.id,
          type: row.type as CultivationEvent["type"],
          occurredAt: row.occurred_at,
          provenance: provenance(row.source, "deterministic"),
          ...(row.severity === "info" || row.severity === "attention" || row.severity === "critical" ? { severity: row.severity } : {}),
          ...(stage ? { stage } : {}),
        }
      })
    },

    async getStageHistory(runId, limit) {
      const { data, error } = await db.from("grow_stage_events").select("stage, confirmed_at, source").eq("run_id", runId).order("confirmed_at", { ascending: false }).limit(limit)
      if (error) throw error
      return (data ?? []).map((row): StageHistoryEntry => ({ stage: row.stage, confirmedAt: row.confirmed_at, provenance: provenance(row.source, "manual") }))
    },

    async getLatestCapture(runId) {
      const { data, error } = await db.from("grow_captures").select("id, captured_at, origin, storage_path, width, height").eq("run_id", runId).order("captured_at", { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        id: data.id,
        capturedAt: data.captured_at,
        provenance: data.origin === "real" ? "sensor" : "simulation",
        storagePath: data.storage_path,
        ...(typeof data.width === "number" ? { width: data.width } : {}),
        ...(typeof data.height === "number" ? { height: data.height } : {}),
      } satisfies CaptureMetadata
    },

    async getRunForOwner(runId, ownerId) {
      const { data, error } = await db.from("grow_cultivation_runs").select("id, chamber_id, species_profile_id, started_at, confirmed_stage, status, ended_at, grow_chambers!inner(owner_id)").eq("id", runId).eq("grow_chambers.owner_id", ownerId).maybeSingle()
      if (error) throw error
      if (!data) return null
      const status = data.status === "active" || data.status === "completed" || data.status === "aborted" ? data.status : null
      if (!status) return null
      return { id: data.id, chamberId: data.chamber_id, speciesProfileId: data.species_profile_id, startedAt: data.started_at, confirmedStage: data.confirmed_stage, status, ...(data.ended_at ? { endedAt: data.ended_at } : {}) } satisfies OwnedRun
    },

    async createRun(input) {
      const { data, error } = await db.from("grow_cultivation_runs").insert({ chamber_id: input.chamberId, species_profile_id: input.profileId, name: input.name, started_at: input.startedAt, confirmed_stage: input.confirmedStage, status: "active" }).select("id").single()
      if (error) {
        if (error.code === "23505") return { status: "active_run_exists" }
        throw error
      }
      return { status: "created", runId: data.id }
    },

    async setConfirmedStage(runId, stage) {
      const { error } = await db.from("grow_cultivation_runs").update({ confirmed_stage: stage }).eq("id", runId).eq("status", "active")
      if (error) throw error
    },

    async completeRun(runId, endedAt, finalStage) {
      const { error } = await db.from("grow_cultivation_runs").update({ status: "completed", ended_at: endedAt, confirmed_stage: finalStage }).eq("id", runId).eq("status", "active")
      if (error) throw error
    },

    async appendStageEvent(input) {
      const { error } = await db.from("grow_stage_events").insert({ run_id: input.runId, stage: input.stage, confirmed_at: input.confirmedAt, source: input.source, actor_id: input.actorId })
      if (error) throw error
    },

    async appendRunEvent(input) {
      const { error } = await db.from("grow_run_events").insert({ run_id: input.runId, type: input.type, occurred_at: input.occurredAt, source: input.source, severity: input.severity ?? null, actor_id: input.actorId, payload: input.payload ?? {} })
      if (error) throw error
    },
  }
}

/** Ingestion store (service role). Credential hashes never leave the server. */
export function createSupabaseIngestionStore(): IngestionStore {
  const db = createAdminClient()
  return {
    async findDeviceByHardwareId(hardwareId) {
      const { data, error } = await db.from("grow_devices").select("id, chamber_id, enabled").eq("hardware_identifier", hardwareId).maybeSingle()
      if (error) throw error
      return data ? { id: data.id, chamberId: data.chamber_id, enabled: data.enabled !== false } : null
    },
    async getActiveCredentialHashes(deviceId) {
      const { data, error } = await db.from("grow_device_credentials").select("key_hash").eq("device_id", deviceId).eq("status", "active")
      if (error) throw error
      return (data ?? []).map((row) => row.key_hash as string)
    },
    async consumeRateLimit(bucket, limit) {
      const { data, error } = await db.rpc("grow_consume_ingestion_limit", { p_bucket: bucket, p_limit: limit })
      if (error || typeof data !== "boolean") throw error ?? new Error("invalid rate limit response")
      return data
    },
    async recordReading(row) {
      const { data, error } = await db.rpc("grow_record_device_reading", {
        p_device_id: row.deviceId,
        p_observed_at: row.observedAt,
        p_temperature: row.temperature,
        p_humidity: row.humidity,
        p_clock: row.clock,
      })
      if (error) throw error
      if (!data || typeof data !== "object" ||
          typeof data.inserted !== "boolean" || typeof data.runAttached !== "boolean") {
        throw new Error("invalid ingestion response")
      }
      return { inserted: data.inserted, runAttached: data.runAttached }
    },
  }
}
