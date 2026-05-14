import type { Incident } from "@/lib/incidents/types"
import type { MaintenanceRecommendation, MttrMetrics, ReliabilityAnalytics } from "./types"

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function computeMttrMetrics(
  incidents: Incident[],
  recommendations: MaintenanceRecommendation[]
): MttrMetrics {
  const resolved = incidents.filter((i) => i.status === "resolved" && i.resolvedAt)
  const bySeverity: Record<string, { count: number; totalMs: number }> = {}
  const bySource: Record<string, { count: number; totalMs: number }> = {}

  for (const inc of resolved) {
    const created = new Date(inc.createdAt).getTime()
    const resolvedTime = new Date(inc.resolvedAt!).getTime()
    const duration = resolvedTime - created

    const sev = inc.severity ?? "unknown"
    if (!bySeverity[sev]) bySeverity[sev] = { count: 0, totalMs: 0 }
    bySeverity[sev].count++
    bySeverity[sev].totalMs += duration
  }

  for (const rec of recommendations) {
    if (rec.status !== "completed" || !rec.completedAt) continue
    const created = new Date(rec.createdAt).getTime()
    const completed = new Date(rec.completedAt).getTime()
    const duration = completed - created

    if (!bySource[rec.source]) bySource[rec.source] = { count: 0, totalMs: 0 }
    bySource[rec.source].count++
    bySource[rec.source].totalMs += duration
  }

  const allDurations = [
    ...resolved.map((i) => new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()),
    ...recommendations
      .filter((r) => r.status === "completed" && r.completedAt)
      .map((r) => new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()),
  ]

  const avgMs = allDurations.length > 0 ? Math.round(average(allDurations)) : 0

  const resolvedCount = resolved.length + recommendations.filter((r) => r.status === "completed").length
  const prevResolved = Math.max(1, resolved.length)
  const trend = avgMs < 3_600_000 ? "improving" : avgMs < 7_200_000 ? "stable" : "degrading"

  return {
    averageResolutionMs: avgMs,
    averageResolutionHours: Math.round((avgMs / 3_600_000) * 10) / 10,
    bySeverity: Object.fromEntries(
      Object.entries(bySeverity).map(([k, v]) => [k, { count: v.count, avgMs: Math.round(v.totalMs / v.count) }])
    ),
    bySource: Object.fromEntries(
      Object.entries(bySource).map(([k, v]) => [k, { count: v.count, avgMs: Math.round(v.totalMs / v.count) }])
    ),
    trend,
  }
}

export function computeReliabilityAnalytics(
  incidents: Incident[],
  recommendations: MaintenanceRecommendation[],
  totalDevices: number
): ReliabilityAnalytics {
  const total = incidents.length
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved")
  const completedTasks = recommendations.filter((r) => r.status === "completed")
  const completionRate = recommendations.length > 0
    ? Math.round((completedTasks.length / recommendations.length) * 100)
    : 100

  const nodeIncidentMap = new Map<string, number>()
  for (const inc of incidents) {
    for (const nid of inc.affectedNodeIds) {
      nodeIncidentMap.set(nid, (nodeIncidentMap.get(nid) ?? 0) + 1)
    }
  }
  const topFailureNodes = Array.from(nodeIncidentMap.entries())
    .map(([nodeId, count]) => ({ nodeId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const incidentRate = totalDevices > 0
    ? Math.round((total / totalDevices) * 100)
    : 0

  const avgDuration = resolvedIncidents.length > 0
    ? average(
        resolvedIncidents
          .filter((i) => i.resolvedAt)
          .map((i) => new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime())
      )
    : 0

  const totalTime = total > 1
    ? Math.abs(
        new Date(incidents[incidents.length - 1]?.createdAt ?? Date.now()).getTime() -
        new Date(incidents[0]?.createdAt ?? Date.now()).getTime()
      )
    : 86_400_000

  const mtbi = total > 1 ? Math.round(totalTime / total) : totalTime

  const avgResolvedScore = resolvedIncidents.length > 0
    ? Math.round(average(resolvedIncidents.map((i) => i.score)))
    : 100

  const trend = avgResolvedScore >= 75 ? "improving" : avgResolvedScore >= 50 ? "stable" : "degrading"

  return {
    overallScore: Math.min(100, Math.max(0, avgResolvedScore)),
    incidentRate,
    maintenanceCompletionRate: completionRate,
    meanTimeBetweenIncidents: mtbi,
    meanTimeToResolve: Math.round(avgDuration),
    topFailureNodes,
    trend,
  }
}
