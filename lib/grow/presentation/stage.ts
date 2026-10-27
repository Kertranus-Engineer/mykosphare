import { profileStages } from "../stages"
import type { GrowthStage, SpeciesProfile, StageId } from "../types"
import { GROW_COPY } from "./copy.es"

/** Display order of the fungal (Pleurotus) cycle — the default profile's stages. */
export const GROW_STAGE_ORDER: readonly GrowthStage[] = [
  "inoculation",
  "colonization",
  "consolidation",
  "primordia",
  "fruiting",
  "harvest",
]

type StageProfile = Pick<SpeciesProfile, "stages"> | null | undefined

/** Localized copy for known ids, else the profile's own label, else the raw id. Never throws. */
export function stageLabel(stage: StageId, profile?: StageProfile): string {
  const copy = (GROW_COPY.stages as Record<string, string>)[stage]
  if (copy) return copy
  return profileStages(profile).find((entry) => entry.id === stage)?.label ?? stage
}

export interface StageStep {
  stage: StageId
  label: string
  status: "done" | "current" | "upcoming"
  /** Heuristic suggestion only; never presented as the current stage. */
  suggested: boolean
}

export interface PresentedStageJourney {
  steps: StageStep[]
  current: { stage: StageId; label: string; position: string }
  possibleChange: { stage: StageId; label: string; body: string } | null
}

/** Stage journey over the PROFILE's ordered stages (fungal default). */
export function presentStageJourney(confirmed: StageId, suggested: StageId | null, profile?: StageProfile): PresentedStageJourney {
  const order = profileStages(profile).map((entry) => entry.id)
  const currentIndex = order.indexOf(confirmed)
  const change = suggested !== null && suggested !== confirmed ? suggested : null
  const steps = order.map((stage, index): StageStep => ({
    stage,
    label: stageLabel(stage, profile),
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
    suggested: stage === change,
  }))
  return {
    steps,
    current: {
      stage: confirmed,
      label: stageLabel(confirmed, profile),
      position: currentIndex >= 0 ? GROW_COPY.stage.position(currentIndex + 1, order.length) : "",
    },
    possibleChange: change
      ? { stage: change, label: stageLabel(change, profile), body: GROW_COPY.stage.possibleChangeBody(stageLabel(change, profile).toLowerCase()) }
      : null,
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Cultivation day counted in elapsed 24-hour blocks from the run start instant.
 * Day 1 is the first 24 hours (a run is never on "Día 0"). Timezone independent,
 * so server and client agree. Returns null for invalid or future starts.
 */
export function cultivationDay(startedAt: string, now: string | Date): number | null {
  const start = new Date(startedAt).getTime()
  const ref = new Date(now).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(ref) || ref < start) return null
  return Math.floor((ref - start) / DAY_MS) + 1
}

export interface PresentedSpecies {
  name: string
  scientificName: string
  isSample: boolean
}

export function presentSpecies(profile: SpeciesProfile): PresentedSpecies {
  return {
    name: GROW_COPY.species.names[profile.scientificName] ?? profile.commonName,
    scientificName: profile.scientificName,
    isSample: profile.kind === "sample",
  }
}
