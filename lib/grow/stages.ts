import type { GrowthStage, SpeciesProfile, StageDefinition, StageId } from "./types"

/**
 * The fungal (Pleurotus) stage declaration — the default for any profile that
 * does not declare its own `stages`. `suggestFromDay` is a product fallback for
 * a SUGGESTION only; it never confirms a biological stage. `mykoForm` is a
 * presentation mapping (several stages share one MYKO form).
 */
export const FUNGAL_STAGE_DEFINITIONS: readonly StageDefinition[] = [
  { id: "inoculation", mykoForm: "early", suggestFromDay: 0 },
  { id: "colonization", mykoForm: "early", suggestFromDay: 3 },
  { id: "consolidation", mykoForm: "early", suggestFromDay: 8 },
  { id: "primordia", mykoForm: "emerging", suggestFromDay: 12 },
  { id: "fruiting", mykoForm: "mature", suggestFromDay: 16 },
  { id: "harvest", mykoForm: "complete", suggestFromDay: 22 },
]

/** The ordered stages of a profile (fungal default when undeclared). */
export function profileStages(profile: Pick<SpeciesProfile, "stages"> | null | undefined): readonly StageDefinition[] {
  return profile?.stages && profile.stages.length > 0 ? profile.stages : FUNGAL_STAGE_DEFINITIONS
}

export function findStage(profile: Pick<SpeciesProfile, "stages"> | null | undefined, stage: StageId): StageDefinition | null {
  return profileStages(profile).find((entry) => entry.id === stage) ?? null
}

export function stageIndex(profile: Pick<SpeciesProfile, "stages"> | null | undefined, stage: StageId): number {
  return profileStages(profile).findIndex((entry) => entry.id === stage)
}

/** Heuristic suggestion from elapsed days, using the profile's own stage table. */
export function suggestStageFromProfile(
  profile: Pick<SpeciesProfile, "stages"> | null | undefined,
  daysSinceStart: number,
): StageId | null {
  if (!Number.isFinite(daysSinceStart) || daysSinceStart < 0) return null
  const table = profileStages(profile).filter((entry) => entry.suggestFromDay !== undefined)
  if (table.length === 0) return null
  let suggestion: StageId | null = null
  for (const entry of table) {
    if (daysSinceStart < (entry.suggestFromDay as number)) break
    suggestion = entry.id
  }
  return suggestion ?? table[0].id
}

const DAY_MS = 24 * 60 * 60 * 1000

export function suggestStageForProfileRun(
  profile: Pick<SpeciesProfile, "stages"> | null | undefined,
  runStartedAt: string,
  now: string | Date,
): StageId | null {
  const startedAt = new Date(runStartedAt).getTime()
  const evaluatedAt = new Date(now).getTime()
  if (!Number.isFinite(startedAt) || !Number.isFinite(evaluatedAt)) return null
  return suggestStageFromProfile(profile, (evaluatedAt - startedAt) / DAY_MS)
}

/** Fungal default (kept for existing callers). */
export function suggestStageByDays(daysSinceStart: number): GrowthStage | null {
  return suggestStageFromProfile(null, daysSinceStart) as GrowthStage | null
}

/** Fungal default (kept for existing callers). */
export function suggestStageForRun(runStartedAt: string, now: string | Date): GrowthStage | null {
  return suggestStageForProfileRun(null, runStartedAt, now) as GrowthStage | null
}
