import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { customMetadata, withOwnerStageTargets, type TargetsInput } from "./targets"

export type SetTargetsResult = { status: "saved" } | { status: "run_not_found" } | { status: "run_not_active" } | { status: "unavailable" }

/**
 * Stores the owner's confirmed ranges for the CONFIRMED stage of an active run.
 * Ownership is resolved through the run's chamber owner before anything is written (service role, server only).
 * First time: derives a private profile from the starting one and points the run at it.
 * Later: updates that same private profile (only if it belongs to this owner).
 */
export async function setOwnerTargets(input: { ownerId: string; runId: string; targets: TargetsInput; now?: Date }): Promise<SetTargetsResult> {
  const db = createAdminClient()
  const nowIso = (input.now ?? new Date()).toISOString()
  try {
    const { data: run, error } = await db.from("grow_cultivation_runs")
      .select("id, status, confirmed_stage, species_profile_id, grow_chambers!inner(owner_id)")
      .eq("id", input.runId).eq("grow_chambers.owner_id", input.ownerId).maybeSingle()
    if (error) throw error
    if (!run) return { status: "run_not_found" }
    if (run.status !== "active") return { status: "run_not_active" }

    const { data: base, error: baseError } = await db.from("grow_species_profiles")
      .select("id, species, display_name, validation_status, stage_targets, organism_kind, morphology, stages, capabilities, metadata")
      .eq("id", run.species_profile_id).maybeSingle()
    if (baseError) throw baseError
    if (!base) return { status: "run_not_found" }

    const stageTargets = withOwnerStageTargets(base.stage_targets, String(run.confirmed_stage), input.targets)
    const metadata = base.metadata as Record<string, unknown> | null
    if (metadata?.custom === true) {
      if (metadata.owner_id !== input.ownerId) return { status: "run_not_found" }
      const { error: updateError } = await db.from("grow_species_profiles")
        .update({ stage_targets: stageTargets, metadata: { ...metadata, confirmed_by_owner: true, confirmed_at: nowIso } }).eq("id", base.id)
      if (updateError) throw updateError
      return { status: "saved" }
    }

    const { data: created, error: insertError } = await db.from("grow_species_profiles").insert({
      species: base.species, display_name: base.display_name, version: `owner-${input.ownerId.slice(0, 8)}-${Date.now().toString(36)}`,
      validation_status: base.validation_status, stage_targets: stageTargets, organism_kind: base.organism_kind, morphology: base.morphology,
      stages: base.stages, capabilities: base.capabilities, metadata: customMetadata(input.ownerId, base.id, nowIso),
    }).select("id").single()
    if (insertError) throw insertError
    const { error: pointError } = await db.from("grow_cultivation_runs").update({ species_profile_id: created.id }).eq("id", run.id).eq("status", "active")
    if (pointError) throw pointError
    return { status: "saved" }
  } catch {
    return { status: "unavailable" }
  }
}
