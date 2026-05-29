import type { TopologyGraph, TopologyNode } from "@/lib/topology/types"
import type { OperationalSummary, OperationalStatus, AlertDensityMetrics } from "@/lib/intelligence/types"
import type { TemporalSummary, DriftAnalysis } from "@/lib/temporal/types"
import type { AlertSeverity } from "@/lib/alerts/types"
import { scoreToStatus } from "@/lib/intelligence/types"
import type { Incident, IncidentSummary } from "@/lib/incidents/types"
import type { MaintenanceRecommendation, MaintenanceSummary, MttrMetrics, ReliabilityAnalytics } from "@/lib/maintenance/types"
import type { ChamberTwinState, TwinHealth } from "@/lib/twin/types"
import type { Command } from "@/lib/commands/types"
import type { AugmentedNode, SystemHealth, CrossLayerSummary, UnifiedOperationalState } from "./types"

function findNodeAlertSeverity(
  nodeId: string,
  nodeLabel: string,
  alerts: { title: string | null; description: string | null; severity: string | null }[]
): { severity: AlertSeverity | null; count: number } {
  const matching = alerts.filter((a) => {
    const desc = (a.description ?? "").toLowerCase()
    const title = (a.title ?? "").toLowerCase()
    const nid = nodeId.toLowerCase()
    const nlab = nodeLabel.toLowerCase()
    return desc.includes(nid) || desc.includes(nlab) || title.includes(nid) || title.includes(nlab)
  })
  if (matching.length === 0) return { severity: null, count: 0 }
  const severities: AlertSeverity[] = ["critical", "warning", "info"]
  for (const s of severities) {
    if (matching.some((a) => a.severity === s)) return { severity: s, count: matching.length }
  }
  return { severity: "info", count: matching.length }
}

function findDriftForMetric(metric: string, drifts: DriftAnalysis[]): { magnitude: number } {
  for (const d of drifts) {
    const dm = d.metrics.find((m) => m.metric === metric)
    if (dm) return { magnitude: dm.driftMagnitude }
  }
  return { magnitude: 0 }
}

function findNodeIncidents(
  nodeId: string,
  nodeLabel: string,
  incidents: Incident[]
): { severity: string | null; count: number } {
  const matching = incidents.filter((inc) => {
    if (inc.status === "resolved") return false
    return (
      inc.affectedNodeIds.includes(nodeId) ||
      inc.affectedNodeIds.some((nid) => nid.toLowerCase() === nodeLabel.toLowerCase())
    )
  })
  if (matching.length === 0) return { severity: null, count: 0 }
  const severities: string[] = ["critical", "high", "medium", "low"]
  for (const s of severities) {
    if (matching.some((inc) => inc.severity === s)) return { severity: s, count: matching.length }
  }
  return { severity: "low", count: matching.length }
}

function findNodeMaintenance(
  nodeId: string,
  nodeLabel: string,
  recommendations: MaintenanceRecommendation[]
): { priority: string | null; count: number } {
  const matching = recommendations.filter((r) => {
    if (r.status === "completed") return false
    return (
      r.affectedNodeIds.includes(nodeId) ||
      r.affectedNodeIds.some((nid) => nid.toLowerCase() === nodeLabel.toLowerCase())
    )
  })
  if (matching.length === 0) return { priority: null, count: 0 }
  const priorities: string[] = ["critical", "high", "medium", "low"]
  for (const p of priorities) {
    if (matching.some((r) => r.priority === p)) return { priority: p, count: matching.length }
  }
  return { priority: "low", count: matching.length }
}

function augmentNodes(
  nodes: TopologyNode[],
  intelligence: OperationalSummary,
  temporal: TemporalSummary,
  activeAlerts: { title: string | null; description: string | null; severity: string | null; resolved: boolean }[],
  incidents: Incident[],
  maintenanceRecommendations: MaintenanceRecommendation[],
  twinState: ChamberTwinState | null,
  commands: Command[]
): AugmentedNode[] {
  const unresolvedAlerts = activeAlerts.filter((a) => !a.resolved)

  return nodes.map((node) => {
    const { severity, count } = findNodeAlertSeverity(node.id, node.label, unresolvedAlerts)
    const { severity: incSeverity, count: incCount } = findNodeIncidents(node.id, node.label, incidents)
    const { priority: mntPriority, count: mntCount } = findNodeMaintenance(node.id, node.label, maintenanceRecommendations)
    const nodeTwinMode = twinState && node.id === twinState.chamberId ? twinState.mode : null
    const nodeTwinHealth = twinState && node.id === twinState.chamberId ? twinState.healthScore : null
    const nodeHasCommands = commands.some(
      (c) =>
        c.targetNodeId === node.id &&
        (c.status === "queued" || c.status === "acknowledged" || c.status === "executing")
    )

    const telemetryQuality = node.telemetryQuality
    const healthScore = node.health
    const reliabilityScore = intelligence.reliability.score

    let driftMagnitude = 0
    let driftDirection: import("@/lib/temporal/types").TrendDirection = "stable"

    if (node.nodeType === "sensor") {
      const tempDrift = findDriftForMetric("temperature", temporal.drifts)
      driftMagnitude = tempDrift.magnitude
      driftDirection = driftMagnitude > 0.5 ? "rising" : "stable"
    } else if (node.nodeType === "esp32") {
      driftMagnitude = intelligence.variance.temperatureVariance
      driftDirection = driftMagnitude > 1 ? "volatile" : "stable"
    }

    const scores = [healthScore, telemetryQuality, reliabilityScore]
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

    const alertPenalty = severity === "critical" ? 25 : severity === "warning" ? 15 : severity === "info" ? 5 : 0
    const driftPenalty = Math.min(Math.round(driftMagnitude * 5), 20)
    const combined = Math.max(0, Math.min(100, avgScore - alertPenalty - driftPenalty))

    return {
      nodeId: node.id,
      label: node.label,
      nodeType: node.nodeType,
      alertSeverity: severity,
      activeAlertCount: count,
      incidentSeverity: incSeverity,
      incidentCount: incCount,
      maintenancePriority: mntPriority,
      maintenanceCount: mntCount,
      twinMode: nodeTwinMode,
      twinHealthScore: nodeTwinHealth,
      commandActive: nodeHasCommands,
      healthScore,
      reliabilityScore,
      telemetryQuality,
      driftMagnitude: Math.round(driftMagnitude * 10) / 10,
      driftDirection,
      combinedStatus: scoreToStatus(combined),
    }
  })
}

function computeSystemHealth(
  augmentedNodes: AugmentedNode[],
  intelligence: OperationalSummary,
  temporal: TemporalSummary,
  incidents: Incident[],
  incidentImpactScore: number,
  maintenanceSummary: MaintenanceSummary,
  twinState: ChamberTwinState | null,
  commands: Command[]
): SystemHealth[] {
  const systems: SystemHealth[] = []

  const nodesWithAlerts = augmentedNodes.filter((n) => n.alertSeverity !== null)
  const nodeAvgScore = augmentedNodes.length > 0
    ? Math.round(augmentedNodes.reduce((s, n) => s + n.healthScore, 0) / augmentedNodes.length)
    : 100
  systems.push({
    system: "topology",
    score: nodeAvgScore,
    status: scoreToStatus(nodeAvgScore),
    impact: nodesWithAlerts.length > 2 ? "severe" : nodesWithAlerts.length > 0 ? "moderate" : "none",
    details: `${augmentedNodes.length} nodes, ${nodesWithAlerts.length} with active alerts`,
  })

  systems.push({
    system: "intelligence",
    score: intelligence.overall.score,
    status: intelligence.overall.status,
    impact: intelligence.overall.score < 55 ? "severe" : intelligence.overall.score < 75 ? "moderate" : "minor",
    details: `Health: ${intelligence.health.score}, Stability: ${intelligence.stability.score}, Reliability: ${intelligence.reliability.score}`,
  })

  systems.push({
    system: "temporal",
    score: temporal.behavior.length > 0
      ? Math.round(temporal.behavior.reduce((s, b) => s + b.reliabilityScore, 0) / temporal.behavior.length)
      : 100,
    status: scoreToStatus(
      temporal.behavior.length > 0
        ? Math.round(temporal.behavior.reduce((s, b) => s + b.reliabilityScore, 0) / temporal.behavior.length)
        : 100
    ),
    impact: temporal.drifts.some((d) => d.significantChanges > 2) ? "moderate" : "minor",
    details: `${temporal.drifts.length} drift analyses, ${temporal.timeline.length} timeline events`,
  })

  const alertScore = intelligence.alertDensity.totalAlerts === 0
    ? 100
    : Math.max(0, 100 - intelligence.alertDensity.alertsPerHour * 10 - intelligence.alertDensity.criticalRatio * 50)
  systems.push({
    system: "alerts",
    score: alertScore,
    status: scoreToStatus(alertScore),
    impact: alertScore < 50 ? "critical" : alertScore < 75 ? "severe" : "minor",
    details: `${intelligence.alertDensity.totalAlerts} alerts, ${intelligence.alertDensity.alertsPerHour}/hr`,
  })

  const activeIncidents = incidents.filter((i) => i.status !== "resolved")
  systems.push({
    system: "incidents",
    score: incidentImpactScore,
    status: scoreToStatus(incidentImpactScore),
    impact: activeIncidents.length > 2 ? "critical" : activeIncidents.length > 0 ? "moderate" : "none",
    details: `${activeIncidents.length} active, ${incidents.filter((i) => i.severity === "critical").length} critical`,
  })

  const maintenanceScore = maintenanceSummary.total > 0
    ? Math.max(0, 100 - maintenanceSummary.pending * 5 - maintenanceSummary.critical * 15 + maintenanceSummary.completed * 2)
    : 100
  systems.push({
    system: "maintenance",
    score: Math.min(100, maintenanceScore),
    status: scoreToStatus(Math.min(100, maintenanceScore)),
    impact: maintenanceSummary.critical > 0 ? "critical" : maintenanceSummary.pending > 3 ? "moderate" : "minor",
    details: `${maintenanceSummary.pending} pending, ${maintenanceSummary.inProgress} in progress, ${maintenanceSummary.completed} completed`,
  })

  const twinScore = twinState?.healthScore ?? 100
  systems.push({
    system: "twin",
    score: twinScore,
    status: scoreToStatus(twinScore),
    impact: twinScore < 55 ? "critical" : twinScore < 75 ? "moderate" : "minor",
    details: twinState ? `Mode: ${twinState.mode}, Health: ${twinState.healthScore}` : "No twin data",
  })

  const activeCommands = commands.filter(
    (c) => c.status === "queued" || c.status === "acknowledged" || c.status === "executing"
  ).length
  const commandScore = activeCommands === 0 ? 100 : Math.max(0, 100 - activeCommands * 10)
  systems.push({
    system: "commands",
    score: commandScore,
    status: scoreToStatus(commandScore),
    impact: activeCommands > 2 ? "moderate" : activeCommands > 0 ? "minor" : "none",
    details: `${activeCommands} active command${activeCommands !== 1 ? "s" : ""}`,
  })

  return systems
}

function computeCrossLayerSummary(
  augmentedNodes: AugmentedNode[],
  systemHealth: SystemHealth[],
  temporal: TemporalSummary,
  alertDensity: AlertDensityMetrics,
  incidents: Incident[],
  maintenanceSummary: MaintenanceSummary,
  twinState: ChamberTwinState | null,
  commands: Command[]
): CrossLayerSummary {
  const topologyNodesWithAlerts = augmentedNodes.filter((n) => n.alertSeverity !== null).length
  const topologyNodesDegraded = augmentedNodes.filter(
    (n) => n.combinedStatus === "degraded" || n.combinedStatus === "unstable" || n.combinedStatus === "critical"
  ).length

  const healthScores = augmentedNodes.map((n) => n.healthScore)
  const alertCorrelated = augmentedNodes.filter((n) => n.alertSeverity !== null).length
  const intelligenceTopologyCorrelation = augmentedNodes.length > 0
    ? Math.round(((augmentedNodes.length - alertCorrelated) / augmentedNodes.length) * 100)
    : 100

  const alertTimelineOverlap = temporal.timeline.filter((e) =>
    e.type === "alert" || e.type === "threshold_breach"
  ).length
  const temporalAlertCorrelation = alertDensity.totalAlerts > 0
    ? Math.round(Math.min(100, (alertTimelineOverlap / Math.max(alertDensity.totalAlerts, 1)) * 100))
    : 100

  const incidentAlertCoverage = alertDensity.totalAlerts > 0
    ? Math.round(
        (incidents.filter((i) => i.status !== "resolved").reduce((sum, inc) => sum + inc.alertIds.length, 0) /
          Math.max(alertDensity.totalAlerts, 1)) *
          100
      )
    : 100

  const maintenanceCoverage = maintenanceSummary.total > 0
    ? Math.max(0, 100 - maintenanceSummary.pending * 3)
    : 100

  const twinOperational = twinState ? Math.max(0, 100 - (twinState.operationalStress * 0.5) - (twinState.contaminationRisk * 0.5)) : 100

  const commandActivity = commands.filter((c) => c.status !== "completed" && c.status !== "failed").length
  const commandCohesion = commandActivity === 0 ? 100 : Math.max(0, 100 - commandActivity * 5)

  const systemAvg = systemHealth.length > 0
    ? Math.round(systemHealth.reduce((s, h) => s + h.score, 0) / systemHealth.length)
    : 100
  const overallCohesion = Math.round((systemAvg + intelligenceTopologyCorrelation + temporalAlertCorrelation + incidentAlertCoverage + maintenanceCoverage + twinOperational + commandCohesion) / 7)

  return {
    topologyNodesWithAlerts,
    topologyNodesDegraded,
    intelligenceTopologyCorrelation,
    temporalAlertCorrelation,
    overallCohesion,
  }
}

export function computeUnifiedState(
  topologyGraph: TopologyGraph,
  intelligence: OperationalSummary,
  temporal: TemporalSummary,
  activeAlerts: { title: string | null; description: string | null; severity: string | null; resolved: boolean }[],
  incidents: Incident[],
  incidentSummary: IncidentSummary,
  incidentImpactScore: number,
  maintenanceRecommendations: MaintenanceRecommendation[],
  maintenanceSummary: MaintenanceSummary,
  maintenanceMttr: MttrMetrics,
  maintenanceReliability: ReliabilityAnalytics,
  twinState: ChamberTwinState | null,
  twinHealth: TwinHealth | null,
  commands: Command[],
  activeCommandCount: number,
  connected: boolean
): UnifiedOperationalState {
  const augmentedNodes = augmentNodes(topologyGraph.nodes, intelligence, temporal, activeAlerts, incidents, maintenanceRecommendations, twinState, commands)
  const systemHealth = computeSystemHealth(augmentedNodes, intelligence, temporal, incidents, incidentImpactScore, maintenanceSummary, twinState, commands)
  const crossLayer = computeCrossLayerSummary(augmentedNodes, systemHealth, temporal, intelligence.alertDensity, incidents, maintenanceSummary, twinState, commands)

  return {
    topologyGraph,
    topologyMetrics: {
      totalNodes: topologyGraph.nodes.length,
      activeNodes: topologyGraph.nodes.filter((n) => n.status === "online").length,
      offlineNodes: topologyGraph.nodes.filter((n) => n.status === "offline").length,
      degradedNodes: topologyGraph.nodes.filter((n) => n.status === "degraded").length,
      warningNodes: topologyGraph.nodes.filter((n) => n.status === "warning").length,
      syncingNodes: topologyGraph.nodes.filter((n) => n.status === "syncing").length,
      standbyNodes: topologyGraph.nodes.filter((n) => n.status === "standby").length,
      avgLatency: 0,
      totalPacketFlow: 0,
      uptimeQuality: Math.round(topologyGraph.nodes.filter((n) => n.status === "online").length / Math.max(topologyGraph.nodes.length, 1) * 100),
      avgHealth: topologyGraph.nodes.length > 0
        ? Math.round(topologyGraph.nodes.reduce((s, n) => s + n.health, 0) / topologyGraph.nodes.length)
        : 100,
    },
    augmentedNodes,
    intelligence,
    temporal,
    incidents,
    incidentSummary,
    incidentImpactScore,
    maintenanceRecommendations,
    maintenanceSummary,
    maintenanceMttr,
    maintenanceReliability,
    twinState,
    twinHealth,
    commands,
    activeCommandCount,
    systemHealth,
    crossLayer,
    connected,
    generatedAt: new Date().toISOString(),
  }
}

export function getAugmentedNodeById(state: UnifiedOperationalState, nodeId: string): AugmentedNode | undefined {
  return state.augmentedNodes.find((n) => n.nodeId === nodeId)
}

export function getNodesByCombinedStatus(state: UnifiedOperationalState, status: OperationalStatus): AugmentedNode[] {
  return state.augmentedNodes.filter((n) => n.combinedStatus === status)
}
