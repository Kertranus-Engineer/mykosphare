import type { GrowthStage } from "./types"

interface StageSuggestion {
  stage: GrowthStage
  startsAtDay: number
}

/** Product fallback only. It does not confirm biological stage. */
const SAMPLE_STAGE_SUGGESTIONS: StageSuggestion[] = [
  { stage: "inoculation", startsAtDay: 0 },
  { stage: "colonization", startsAtDay: 3 },
  { stage: "consolidation", startsAtDay: 8 },
  { stage: "primordia", startsAtDay: 12 },
  { stage: "fruiting", startsAtDay: 16 },
  { stage: "harvest", startsAtDay: 22 },
]

export function suggestStageByDays(daysSinceStart: number): GrowthStage | null {
  if (!Number.isFinite(daysSinceStart) || daysSinceStart < 0) return null

  let suggestion: GrowthStage = "inoculation"
  for (const entry of SAMPLE_STAGE_SUGGESTIONS) {
    if (daysSinceStart < entry.startsAtDay) break
    suggestion = entry.stage
  }
  return suggestion
}

export function suggestStageForRun(runStartedAt: string, now: string | Date): GrowthStage | null {
  const startedAt = new Date(runStartedAt).getTime()
  const evaluatedAt = new Date(now).getTime()
  if (!Number.isFinite(startedAt) || !Number.isFinite(evaluatedAt)) return null
  return suggestStageByDays((evaluatedAt - startedAt) / (24 * 60 * 60 * 1000))
}
