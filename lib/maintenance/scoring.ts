import type { MaintenanceRecommendation, MaintenanceSource, MaintenanceSummary } from "./types"

const SOURCE_WEIGHTS: Record<MaintenanceSource, number> = {
  "recurring-incident": 35,
  "sensor-drift": 20,
  "heartbeat-instability": 25,
  "reliability-degradation": 30,
  "alert-density": 15,
}

export function computeMaintenancePriority(
  baseScore: number,
  severityCount: number,
  source: MaintenanceSource
): MaintenanceRecommendation["priority"] {
  const sourceWeight = SOURCE_WEIGHTS[source] ?? 20
  const countPenalty = Math.min(severityCount * 5, 25)
  const effective = baseScore - countPenalty + sourceWeight

  if (effective < 30) return "critical"
  if (effective < 50) return "high"
  if (effective < 70) return "medium"
  return "low"
}

export function computeMaintenanceSummary(
  recommendations: MaintenanceRecommendation[]
): MaintenanceSummary {
  const bySource: Record<MaintenanceSource, number> = {
    "recurring-incident": 0,
    "sensor-drift": 0,
    "heartbeat-instability": 0,
    "reliability-degradation": 0,
    "alert-density": 0,
  }

  let pending = 0
  let inProgress = 0
  let completed = 0
  let critical = 0
  let totalScore = 0

  for (const rec of recommendations) {
    bySource[rec.source] = (bySource[rec.source] ?? 0) + 1
    if (rec.status === "pending") pending++
    if (rec.status === "in_progress") inProgress++
    if (rec.status === "completed") completed++
    if (rec.priority === "critical") critical++
    totalScore += rec.score
  }

  return {
    total: recommendations.length,
    pending,
    inProgress,
    completed,
    critical,
    avgScore: recommendations.length > 0 ? Math.round(totalScore / recommendations.length) : 100,
    bySource,
  }
}

export function priorityToColor(priority: string): string {
  switch (priority) {
    case "critical": return "text-red-500"
    case "high": return "text-orange-500"
    case "medium": return "text-amber-500"
    case "low": return "text-blue-500"
    default: return "text-muted-foreground"
  }
}

export function priorityToBg(priority: string): string {
  switch (priority) {
    case "critical": return "bg-red-500/10"
    case "high": return "bg-orange-500/10"
    case "medium": return "bg-amber-500/10"
    case "low": return "bg-blue-500/10"
    default: return "bg-muted/30"
  }
}

export function statusToColor(status: string): string {
  switch (status) {
    case "pending": return "text-muted-foreground"
    case "scheduled": return "text-blue-500"
    case "in_progress": return "text-amber-500"
    case "completed": return "text-emerald-500"
    default: return "text-muted-foreground"
  }
}

export function statusToBg(status: string): string {
  switch (status) {
    case "pending": return "bg-muted/30"
    case "scheduled": return "bg-blue-500/10"
    case "in_progress": return "bg-amber-500/10"
    case "completed": return "bg-emerald-500/10"
    default: return "bg-muted/30"
  }
}
