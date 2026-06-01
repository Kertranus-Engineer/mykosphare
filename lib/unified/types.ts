import type { TopologyGraph, TopologyMetrics } from "@/lib/topology/types"
import type { OperationalSummary, OperationalStatus } from "@/lib/intelligence/types"
import type { TemporalSummary, TrendDirection } from "@/lib/temporal/types"
import type { AlertSeverity } from "@/lib/alerts/types"
import type { Incident, IncidentSummary } from "@/lib/incidents/types"
import type { MaintenanceRecommendation, MaintenanceSummary, MttrMetrics, ReliabilityAnalytics } from "@/lib/maintenance/types"
import type { ChamberTwinState, ChamberHealth } from "@/lib/twin/types"
import type { Command } from "@/lib/commands/types"

export interface AugmentedNode {
  nodeId: string
  label: string
  nodeType: string
  alertSeverity: AlertSeverity | null
  activeAlertCount: number
  incidentSeverity: string | null
  incidentCount: number
  maintenancePriority: string | null
  maintenanceCount: number
  twinMode: string | null
  twinHealthScore: number | null
  commandActive: boolean
  healthScore: number
  reliabilityScore: number
  telemetryQuality: number
  driftMagnitude: number
  driftDirection: TrendDirection
  combinedStatus: OperationalStatus
}

export interface SystemHealth {
  system: string
  score: number
  status: OperationalStatus
  impact: "none" | "minor" | "moderate" | "severe" | "critical"
  details: string
}

export interface CrossLayerSummary {
  topologyNodesWithAlerts: number
  topologyNodesDegraded: number
  intelligenceTopologyCorrelation: number
  temporalAlertCorrelation: number
  overallCohesion: number
}

export interface UnifiedOperationalState {
  topologyGraph: TopologyGraph
  topologyMetrics: TopologyMetrics
  augmentedNodes: AugmentedNode[]
  intelligence: OperationalSummary
  temporal: TemporalSummary
  incidents: Incident[]
  incidentSummary: IncidentSummary
  incidentImpactScore: number
  maintenanceRecommendations: MaintenanceRecommendation[]
  maintenanceSummary: MaintenanceSummary
  maintenanceMttr: MttrMetrics
  maintenanceReliability: ReliabilityAnalytics
  twinState: ChamberTwinState | null
  twinHealth: ChamberHealth | null
  commands: Command[]
  activeCommandCount: number
  systemHealth: SystemHealth[]
  crossLayer: CrossLayerSummary
  connected: boolean
  generatedAt: string
}
