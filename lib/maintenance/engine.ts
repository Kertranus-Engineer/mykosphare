import type { MaintenanceRecommendation, MaintenanceSource } from "./types"
import type { Incident } from "@/lib/incidents/types"
import type { DriftAnalysis } from "@/lib/temporal/types"
import type { DeviceReliabilityScore, AlertDensityMetrics, TelemetryVarianceAnalysis } from "@/lib/intelligence/types"
import { computeMaintenancePriority } from "./scoring"

let nextId = 1
function generateId(): string {
  return `mnt-${Date.now()}-${nextId++}`
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function countByNode(incidents: Incident[]): { nodeId: string; count: number }[] {
  const map = new Map<string, number>()
  for (const inc of incidents) {
    for (const nid of inc.affectedNodeIds) {
      map.set(nid, (map.get(nid) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([nodeId, count]) => ({ nodeId, count }))
    .sort((a, b) => b.count - a.count)
}

export function generateRecurringIncidentRecommendations(
  incidents: Incident[],
  maxRecs = 2
): MaintenanceRecommendation[] {
  const nodeCounts = countByNode(incidents.filter((i) => i.status !== "resolved"))
  if (nodeCounts.length === 0) return []

  const recs: MaintenanceRecommendation[] = []
  for (const { nodeId, count } of nodeCounts.slice(0, maxRecs)) {
    if (count < 2) continue

    const nodeIncidents = incidents.filter(
      (i) => i.affectedNodeIds.includes(nodeId) && i.status !== "resolved"
    )
    const avgScore = average(nodeIncidents.map((i) => i.score))
    const priority = computeMaintenancePriority(avgScore, count, "recurring-incident")
    const now = new Date().toISOString()

    recs.push({
      id: generateId(),
      title: `Recurring Issues on ${nodeId}`,
      description: `${count} active incidents affecting ${nodeId} — recurring failure pattern detected`,
      status: "pending",
      priority,
      score: Math.round(avgScore),
      source: "recurring-incident",
      sourceData: { nodeId, incidentCount: count, incidentIds: nodeIncidents.map((i) => i.id) },
      affectedNodeIds: [nodeId],
      affectedSystems: nodeIncidents.flatMap((i) => i.affectedSystems),
      suggestedAction: `Inspect and service ${nodeId} — recurring incident pattern suggests underlying hardware or configuration issue`,
      estimatedEffort: count > 3 ? "extended" : "moderate",
      createdAt: now,
      updatedAt: now,
      scheduledAt: null,
      completedAt: null,
    })
  }
  return recs
}

export function generateDriftRecommendations(
  drifts: DriftAnalysis[]
): MaintenanceRecommendation[] {
  const recs: MaintenanceRecommendation[] = []
  for (const drift of drifts) {
    const significantDrifts = drift.metrics.filter((m) => m.driftMagnitude > 0.8)
    if (significantDrifts.length === 0) continue

    const avgDrift = average(significantDrifts.map((m) => m.driftMagnitude))
    const priority = computeMaintenancePriority(
      Math.max(0, 100 - avgDrift * 20),
      significantDrifts.length,
      "sensor-drift"
    )
    const now = new Date().toISOString()
    const metricNames = significantDrifts.map((m) => m.metric).join(", ")

    recs.push({
      id: generateId(),
      title: `Sensor Drift Detected (${drift.window})`,
      description: `${significantDrifts.length} metric(s) showing significant drift: ${metricNames} — calibration may be needed`,
      status: "pending",
      priority,
      score: Math.round(Math.max(0, 100 - avgDrift * 15)),
      source: "sensor-drift",
      sourceData: { window: drift.window, significantDrifts: significantDrifts.length, avgDriftMagnitude: Math.round(avgDrift * 10) / 10, metrics: significantDrifts.map((m) => m.metric) },
      affectedNodeIds: [],
      affectedSystems: significantDrifts.map((m) => m.metric),
      suggestedAction: "Recalibrate affected sensors and verify against reference — schedule offline calibration window",
      estimatedEffort: "moderate",
      createdAt: now,
      updatedAt: now,
      scheduledAt: null,
      completedAt: null,
    })
  }
  return recs
}

export function generateHeartbeatRecommendations(
  devices: { deviceId: string; health: number; uptime: number; status: string }[]
): MaintenanceRecommendation[] {
  const recs: MaintenanceRecommendation[] = []
  const unstableDevices = devices.filter(
    (d) => d.status === "warning" || d.health < 70 || d.uptime < 300
  )

  for (const dev of unstableDevices.slice(0, 3)) {
    const healthScore = dev.health
    const priority = computeMaintenancePriority(
      healthScore,
      Math.round((100 - healthScore) / 10),
      "heartbeat-instability"
    )
    const now = new Date().toISOString()

    recs.push({
      id: generateId(),
      title: `Heartbeat Instability — ${dev.deviceId}`,
      description: `${dev.deviceId} reporting health ${dev.health}%, uptime ${dev.uptime}s — intermittent connectivity detected`,
      status: "pending",
      priority,
      score: healthScore,
      source: "heartbeat-instability",
      sourceData: { deviceId: dev.deviceId, health: dev.health, uptime: dev.uptime, status: dev.status },
      affectedNodeIds: [dev.deviceId],
      affectedSystems: ["connectivity"],
      suggestedAction: `Inspect network connection and power supply for ${dev.deviceId} — check for RF interference or power cycling`,
      estimatedEffort: "quick",
      createdAt: now,
      updatedAt: now,
      scheduledAt: null,
      completedAt: null,
    })
  }
  return recs
}

export function generateReliabilityRecommendations(
  reliability: DeviceReliabilityScore
): MaintenanceRecommendation[] {
  if (reliability.score >= 80) return []

  const onlineRatio = reliability.onlineDevices / Math.max(reliability.totalDevices, 1)
  const priority = computeMaintenancePriority(
    reliability.score,
    reliability.totalDevices - reliability.onlineDevices,
    "reliability-degradation"
  )
  const now = new Date().toISOString()

  return [
    {
      id: generateId(),
      title: "Device Reliability Degradation",
      description: `Overall reliability ${reliability.score}% — ${reliability.onlineDevices}/${reliability.totalDevices} devices online, heartbeat compliance ${reliability.heartbeatCompliance}%`,
      status: "pending",
      priority,
      score: reliability.score,
      source: "reliability-degradation",
      sourceData: { onlineDevices: reliability.onlineDevices, totalDevices: reliability.totalDevices, heartbeatCompliance: reliability.heartbeatCompliance },
      affectedNodeIds: [],
      affectedSystems: ["device-management", "connectivity"],
      suggestedAction: "Schedule full device inventory check — identify offline devices and perform health assessment on degraded units",
      estimatedEffort: "extended",
      createdAt: now,
      updatedAt: now,
      scheduledAt: null,
      completedAt: null,
    },
  ]
}

export function generateAlertDensityRecommendations(
  alertDensity: AlertDensityMetrics
): MaintenanceRecommendation[] {
  if (alertDensity.totalAlerts === 0 || alertDensity.alertsPerHour < 2) return []

  const priority = computeMaintenancePriority(
    Math.max(0, 100 - alertDensity.alertsPerHour * 8),
    alertDensity.totalAlerts,
    "alert-density"
  )
  const now = new Date().toISOString()

  return [
    {
      id: generateId(),
      title: "High Alert Density",
      description: `${alertDensity.totalAlerts} alerts in analysis window (${alertDensity.alertsPerHour}/hr) — ${(alertDensity.criticalRatio * 100).toFixed(0)}% critical — excessive noise may mask genuine issues`,
      status: "pending",
      priority,
      score: Math.max(0, 100 - alertDensity.alertsPerHour * 10),
      source: "alert-density",
      sourceData: { totalAlerts: alertDensity.totalAlerts, alertsPerHour: alertDensity.alertsPerHour, criticalRatio: alertDensity.criticalRatio },
      affectedNodeIds: [],
      affectedSystems: ["alerting"],
      suggestedAction: "Review alert thresholds and rules — excessive alerting suggests threshold tuning or sensor calibration needed",
      estimatedEffort: "moderate",
      createdAt: now,
      updatedAt: now,
      scheduledAt: null,
      completedAt: null,
    },
  ]
}

export function generateAllRecommendations(
  incidents: Incident[],
  drifts: DriftAnalysis[],
  devices: { deviceId: string; health: number; uptime: number; status: string }[],
  reliability: DeviceReliabilityScore,
  alertDensity: AlertDensityMetrics
): MaintenanceRecommendation[] {
  return [
    ...generateRecurringIncidentRecommendations(incidents),
    ...generateDriftRecommendations(drifts),
    ...generateHeartbeatRecommendations(devices),
    ...generateReliabilityRecommendations(reliability),
    ...generateAlertDensityRecommendations(alertDensity),
  ].sort((a, b) => {
    const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 }
    return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0)
  })
}
