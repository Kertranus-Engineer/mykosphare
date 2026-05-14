import type { Incident, IncidentSeverity, IncidentSummary, IncidentScoreMeta } from "./types"
import { scoreToStatus } from "@/lib/intelligence/types"

const SEVERITY_WEIGHT: Record<IncidentSeverity, number> = {
  critical: 40,
  high: 25,
  medium: 12,
  low: 5,
}

export function computeIncidentScore(severity: IncidentSeverity, alertCount: number, nodeCount: number): number {
  const severityBase = 100 - SEVERITY_WEIGHT[severity]
  const alertPenalty = Math.min(alertCount * 3, 30)
  const nodePenalty = Math.min(nodeCount * 5, 20)
  const raw = severityBase - alertPenalty - nodePenalty
  return Math.max(0, Math.min(100, raw))
}

export function getIncidentScoreMeta(incident: Incident): IncidentScoreMeta {
  return {
    score: incident.score,
    severity: incident.severity,
    label: incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1),
  }
}

export function computeIncidentSummary(incidents: Incident[]): IncidentSummary {
  const bySeverity: Record<IncidentSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  const byStatus: Record<string, number> = { open: 0, acknowledged: 0, mitigating: 0, resolved: 0 }

  let resolvedCount = 0
  let totalResolutionMs = 0

  for (const inc of incidents) {
    bySeverity[inc.severity] = (bySeverity[inc.severity] ?? 0) + 1
    byStatus[inc.status] = (byStatus[inc.status] ?? 0) + 1

    if (inc.status === "resolved" && inc.resolvedAt) {
      const created = new Date(inc.createdAt).getTime()
      const resolved = new Date(inc.resolvedAt).getTime()
      totalResolutionMs += resolved - created
      resolvedCount++
    }
  }

  return {
    totalIncidents: incidents.length,
    openIncidents: byStatus.open ?? 0,
    criticalIncidents: bySeverity.critical ?? 0,
    avgResolutionMs: resolvedCount > 0 ? Math.round(totalResolutionMs / resolvedCount) : null,
    incidentsBySeverity: bySeverity,
    incidentsByStatus: byStatus as IncidentSummary["incidentsByStatus"],
  }
}

export function computeIncidentImpactScore(summary: IncidentSummary): number {
  if (summary.totalIncidents === 0) return 100

  const openPenalty = (summary.openIncidents / Math.max(summary.totalIncidents, 1)) * 30
  const criticalPenalty = (summary.criticalIncidents / Math.max(summary.totalIncidents, 1)) * 40

  let resolutionBonus = 0
  if (summary.avgResolutionMs !== null && summary.totalIncidents > 0) {
    const resolvedRatio = (summary.totalIncidents - summary.openIncidents) / summary.totalIncidents
    const resolutionEfficiency = Math.max(0, 1 - summary.avgResolutionMs / 3_600_000)
    resolutionBonus = resolvedRatio * resolutionEfficiency * 15
  }

  const raw = 100 - openPenalty - criticalPenalty + resolutionBonus
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export function scoreToIncidentSeverity(score: number): IncidentSeverity {
  if (score < 30) return "critical"
  if (score < 55) return "high"
  if (score < 75) return "medium"
  return "low"
}

export function incidentStatusToColor(status: string): string {
  switch (status) {
    case "open": return "text-red-500"
    case "acknowledged": return "text-amber-500"
    case "mitigating": return "text-blue-500"
    case "resolved": return "text-emerald-500"
    default: return "text-muted-foreground"
  }
}

export function incidentStatusToBg(status: string): string {
  switch (status) {
    case "open": return "bg-red-500/10"
    case "acknowledged": return "bg-amber-500/10"
    case "mitigating": return "bg-blue-500/10"
    case "resolved": return "bg-emerald-500/10"
    default: return "bg-muted/30"
  }
}

export function incidentScoreToOperationalStatus(score: number): ReturnType<typeof scoreToStatus> {
  return scoreToStatus(score)
}
