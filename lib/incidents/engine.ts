import type { IncidentCorrelationInput, IncidentCorrelationGroup } from "./types"
import type { IncidentSeverity } from "./types"

function mapAlertSeverity(severity: string | null): IncidentSeverity {
  if (severity === "critical") return "critical"
  if (severity === "warning") return "high"
  return "medium"
}

function severityRank(severity: IncidentSeverity): number {
  switch (severity) {
    case "critical": return 4
    case "high": return 3
    case "medium": return 2
    case "low": return 1
  }
}

export function findAffectedNodesAndSystems(
  alerts: IncidentCorrelationInput[]
): { affectedNodeIds: string[]; affectedSystems: string[] } {
  const nodeIds = new Set<string>()
  const systems = new Set<string>()
  for (const a of alerts) {
    if (a.nodeId) nodeIds.add(a.nodeId)
    if (a.nodeLabel) {
      const nid = a.nodeId ?? a.nodeLabel.toLowerCase().replace(/\s+/g, "-")
      nodeIds.add(nid)
    }
    if (a.system) systems.add(a.system)
  }
  return { affectedNodeIds: Array.from(nodeIds), affectedSystems: Array.from(systems) }
}

function worstSeverity(alerts: IncidentCorrelationInput[]): IncidentSeverity {
  let worst: IncidentSeverity = "low"
  for (const a of alerts) {
    const s = mapAlertSeverity(a.severity)
    if (severityRank(s) > severityRank(worst)) worst = s
  }
  return worst
}

function correlateByTimeWindow(
  alerts: IncidentCorrelationInput[],
  windowMs: number
): IncidentCorrelationGroup[] {
  const sorted = [...alerts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const groups: IncidentCorrelationGroup[] = []
  const used = new Set<string>()

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].alertId)) continue
    const cluster: IncidentCorrelationInput[] = [sorted[i]]
    used.add(sorted[i].alertId)
    const baseTime = new Date(sorted[i].timestamp).getTime()

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(sorted[j].alertId)) continue
      const t = new Date(sorted[j].timestamp).getTime()
      if (t - baseTime <= windowMs) {
        cluster.push(sorted[j])
        used.add(sorted[j].alertId)
      }
    }

    if (cluster.length >= 2) {
      const { affectedNodeIds, affectedSystems } = findAffectedNodesAndSystems(cluster)
      groups.push({
        alertIds: cluster.map((a) => a.alertId),
        correlationType: "time-window",
        severity: worstSeverity(cluster),
        affectedNodeIds,
        affectedSystems,
      })
    }
  }

  return groups
}

function correlateByTopology(
  alerts: IncidentCorrelationInput[]
): IncidentCorrelationGroup[] {
  const nodeAlertMap = new Map<string, IncidentCorrelationInput[]>()
  for (const a of alerts) {
    const key = a.nodeId ?? a.nodeLabel ?? "unknown"
    const existing = nodeAlertMap.get(key) ?? []
    existing.push(a)
    nodeAlertMap.set(key, existing)
  }

  const groups: IncidentCorrelationGroup[] = []
  for (const [, nodeAlerts] of nodeAlertMap) {
    if (nodeAlerts.length >= 2) {
      const { affectedNodeIds, affectedSystems } = findAffectedNodesAndSystems(nodeAlerts)
      groups.push({
        alertIds: nodeAlerts.map((a) => a.alertId),
        correlationType: "topology",
        severity: worstSeverity(nodeAlerts),
        affectedNodeIds,
        affectedSystems,
      })
    }
  }

  return mergeOverlappingGroups(groups)
}

function mergeOverlappingGroups(groups: IncidentCorrelationGroup[]): IncidentCorrelationGroup[] {
  if (groups.length <= 1) return groups
  const merged: IncidentCorrelationGroup[] = []
  const used = new Set<number>()

  for (let i = 0; i < groups.length; i++) {
    if (used.has(i)) continue
    let current = groups[i]
    used.add(i)
    for (let j = i + 1; j < groups.length; j++) {
      if (used.has(j)) continue
      const overlap = current.alertIds.some((id) => groups[j].alertIds.includes(id))
      if (overlap) {
        const allIds = Array.from(new Set([...current.alertIds, ...groups[j].alertIds]))
        const allNodes = Array.from(new Set([...current.affectedNodeIds, ...groups[j].affectedNodeIds]))
        const allSystems = Array.from(new Set([...current.affectedSystems, ...groups[j].affectedSystems]))
        current = {
          alertIds: allIds,
          correlationType: "cascading",
          severity: severityRank(current.severity) > severityRank(groups[j].severity)
            ? current.severity
            : groups[j].severity,
          affectedNodeIds: allNodes,
          affectedSystems: allSystems,
        }
        used.add(j)
      }
    }
    merged.push(current)
  }
  return merged
}

export function correlateAlerts(
  alerts: IncidentCorrelationInput[],
  timeWindowMs: number = 300_000
): IncidentCorrelationGroup[] {
  const uniqueAlerts = alerts.filter((a, i, arr) => arr.findIndex((x) => x.alertId === a.alertId) === i)

  const timeGroups = correlateByTimeWindow(uniqueAlerts, timeWindowMs)
  const topoGroups = correlateByTopology(uniqueAlerts)

  const allGroups = [...timeGroups, ...topoGroups]
  return mergeOverlappingGroups(allGroups)
}

export function findUncorrelatedAlerts(
  alerts: IncidentCorrelationInput[],
  groups: IncidentCorrelationGroup[]
): IncidentCorrelationInput[] {
  const correlatedIds = new Set(groups.flatMap((g) => g.alertIds))
  return alerts.filter((a) => !correlatedIds.has(a.alertId))
}
