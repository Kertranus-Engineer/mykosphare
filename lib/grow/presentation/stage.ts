import type { GrowthStage, SpeciesProfile } from "../types"
import { GROW_COPY } from "./copy.es"

/** Display order of the cultivation cycle. */
export const GROW_STAGE_ORDER: readonly GrowthStage[] = [
  "inoculation",
  "colonization",
  "consolidation",
  "primordia",
  "fruiting",
  "harvest",
]

export function stageLabel(stage: GrowthStage): string {
  return GROW_COPY.stages[stage]
}

export interface StageStep {
  stage: GrowthStage
  label: string
  status: "done" | "current" | "upcoming"
  /** Heuristic suggestion only; never presented as the current stage. */
  suggested: boolean
}

export interface PresentedStageJourney {
  steps: StageStep[]
  current: { stage: GrowthStage; label: string; position: string }
  possibleChange: { stage: GrowthStage; label: string; body: string } | null
}

export function presentStageJourney(confirmed: GrowthStage, suggested: GrowthStage | null): PresentedStageJourney {
  const currentIndex = GROW_STAGE_ORDER.indexOf(confirmed)
  const change = suggested !== null && suggested !== confirmed ? suggested : null
  const steps = GROW_STAGE_ORDER.map((stage, index): StageStep => ({
    stage,
    label: stageLabel(stage),
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming",
    suggested: stage === change,
  }))
  return {
    steps,
    current: { stage: confirmed, label: stageLabel(confirmed), position: GROW_COPY.stage.position(currentIndex + 1, GROW_STAGE_ORDER.length) },
    possibleChange: change
      ? { stage: change, label: stageLabel(change), body: GROW_COPY.stage.possibleChangeBody(stageLabel(change).toLowerCase()) }
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
