export type MaintenanceStatus = "pending" | "scheduled" | "in_progress" | "completed"

export type MaintenanceSource =
  | "recurring-incident"
  | "sensor-drift"
  | "heartbeat-instability"
  | "reliability-degradation"
  | "alert-density"

export interface MaintenanceRecommendation {
  id: string
  title: string
  description: string
  status: MaintenanceStatus
  priority: "critical" | "high" | "medium" | "low"
  score: number
  source: MaintenanceSource
  sourceData: Record<string, unknown>
  affectedNodeIds: string[]
  affectedSystems: string[]
  suggestedAction: string
  estimatedEffort: "quick" | "moderate" | "extended"
  createdAt: string
  updatedAt: string
  scheduledAt: string | null
  completedAt: string | null
}

export interface MaintenanceSummary {
  total: number
  pending: number
  inProgress: number
  completed: number
  critical: number
  avgScore: number
  bySource: Record<MaintenanceSource, number>
}

export interface MttrMetrics {
  averageResolutionMs: number
  averageResolutionHours: number
  bySeverity: Record<string, { count: number; avgMs: number }>
  bySource: Record<string, { count: number; avgMs: number }>
  trend: "improving" | "stable" | "degrading"
}

export interface ReliabilityAnalytics {
  overallScore: number
  incidentRate: number
  maintenanceCompletionRate: number
  meanTimeBetweenIncidents: number
  meanTimeToResolve: number
  topFailureNodes: { nodeId: string; count: number }[]
  trend: "improving" | "stable" | "degrading"
}
