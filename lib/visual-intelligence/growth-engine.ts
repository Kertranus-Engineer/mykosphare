export type GrowthStage = "inoculation" | "colonization" | "consolidation" | "primordia" | "fruiting" | "harvest"

export interface GrowthResult {
  stage: GrowthStage
  progress: number
  label: string
}

const DAY_THRESHOLDS: { stage: GrowthStage; label: string; minDays: number; maxDays: number }[] = [
  { stage: "inoculation", label: "Inoculation", minDays: 0, maxDays: 3 },
  { stage: "colonization", label: "Colonization", minDays: 3, maxDays: 8 },
  { stage: "consolidation", label: "Consolidation", minDays: 8, maxDays: 12 },
  { stage: "primordia", label: "Primordia", minDays: 12, maxDays: 16 },
  { stage: "fruiting", label: "Fruiting", minDays: 16, maxDays: 22 },
  { stage: "harvest", label: "Harvest", minDays: 22, maxDays: Infinity },
]

export function computeGrowth(daysSinceStart: number): GrowthResult {
  for (const t of DAY_THRESHOLDS) {
    if (daysSinceStart < t.maxDays) {
      const stageSpan = t.maxDays - t.minDays
      const dayInStage = daysSinceStart - t.minDays
      const progress = Math.round((dayInStage / stageSpan) * 100)
      return {
        stage: t.stage,
        progress: Math.min(100, Math.max(0, progress)),
        label: t.label,
      }
    }
  }
  return { stage: "harvest", progress: 100, label: "Harvest" }
}

export function computeDaysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  return (end - start) / (1000 * 60 * 60 * 24)
}

export function computeTotalGrowth(startIso: string, currentIso: string): GrowthResult {
  const days = computeDaysBetween(startIso, currentIso)
  return computeGrowth(days)
}
