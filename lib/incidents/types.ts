export type IncidentStatus = "open" | "acknowledged" | "mitigating" | "resolved"

export type IncidentSeverity = "critical" | "high" | "medium" | "low"

export type CorrelationType = "time-window" | "cascading" | "topology" | "manual"

export type IncidentEventType =
  | "created"
  | "acknowledged"
  | "mitigation_started"
  | "resolved"
  | "alert_added"
  | "escalated"
  | "correlated"

export interface IncidentEvent {
  id: string
  incidentId: string
  type: IncidentEventType
  timestamp: string
  description: string
}

export interface Incident {
  id: string
  title: string
  description: string
  status: IncidentStatus
  severity: IncidentSeverity
  score: number
  alertIds: string[]
  affectedNodeIds: string[]
  affectedSystems: string[]
  timeline: IncidentEvent[]
  correlationType: CorrelationType
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  acknowledgedAt: string | null
}

export interface IncidentSummary {
  totalIncidents: number
  openIncidents: number
  criticalIncidents: number
  avgResolutionMs: number | null
  incidentsBySeverity: Record<IncidentSeverity, number>
  incidentsByStatus: Record<IncidentStatus, number>
}

export interface IncidentCorrelationInput {
  alertId: string
  severity: string | null
  title: string | null
  description: string | null
  nodeId?: string
  nodeLabel?: string
  system?: string
  timestamp: string | number
  resolved: boolean
}

export interface IncidentCorrelationGroup {
  alertIds: string[]
  correlationType: CorrelationType
  severity: IncidentSeverity
  affectedNodeIds: string[]
  affectedSystems: string[]
}

export interface IncidentScoreMeta {
  score: number
  severity: IncidentSeverity
  label: string
}

export interface IncidentActions {
  acknowledge: (id: string) => void
  startMitigation: (id: string) => void
  resolve: (id: string) => void
}
