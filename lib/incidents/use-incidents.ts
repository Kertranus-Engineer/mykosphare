"use client"

import { useMemo, useCallback, useState } from "react"
import { useRealtimeAlerts } from "@/lib/realtime/subscriptions"
import { correlateAlerts } from "./engine"
import { computeIncidentScore, computeIncidentSummary, computeIncidentImpactScore } from "./scoring"
import type { Incident, IncidentStatus, IncidentEvent, IncidentCorrelationInput, CorrelationType, IncidentActions, IncidentSummary } from "./types"

let nextId = 1
function generateId(): string {
  return `inc-${Date.now()}-${nextId++}`
}

function makeIncidentEvent(incidentId: string, type: IncidentEvent["type"], description: string): IncidentEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    incidentId,
    type,
    timestamp: new Date().toISOString(),
    description,
  }
}

function buildTitle(severity: string, correlationType: CorrelationType, nodeCount: number): string {
  const prefix = severity === "critical" ? "Critical" : severity === "high" ? "High" : severity === "medium" ? "Moderate" : "Minor"
  const typeLabel = correlationType === "time-window" ? "Burst" : correlationType === "topology" ? "Topology" : correlationType === "cascading" ? "Cascading" : "Manual"
  const scope = nodeCount > 0 ? ` (${nodeCount} node${nodeCount > 1 ? "s" : ""})` : ""
  return `${prefix} ${typeLabel} Incident${scope}`
}

function buildDescription(group: { alertIds: string[]; correlationType: CorrelationType; affectedSystems: string[] }): string {
  const systemPart = group.affectedSystems.length > 0
    ? ` affecting ${group.affectedSystems.join(", ")}`
    : ""
  const typeLabel = group.correlationType === "time-window" ? "time-correlated burst" :
    group.correlationType === "topology" ? "topology-correlated" :
    group.correlationType === "cascading" ? "cascading failure" : "manual"
  return `${group.alertIds.length} ${typeLabel} alert${group.alertIds.length > 1 ? "s" : ""}${systemPart} — automated correlation`
}

function alertToCorrelationInput(a: {
  id: string
  severity: string | null
  title: string | null
  description: string | null
  created_at: string | null
  resolved: boolean
  resolved_at?: string | null
}): IncidentCorrelationInput {
  const desc = a.description ?? ""
  const nodeMatch = desc.match(/node[:\s]+([a-z0-9_-]+)/i)
  const systemMatch = desc.match(/system[:\s]+([a-z0-9_-]+)/i)
  const sensorMatch = desc.match(/sensor[:\s]+([a-z0-9_-]+)/i)
  const nodeId = nodeMatch?.[1] ?? sensorMatch?.[1] ?? undefined
  const system = systemMatch?.[1] ?? undefined

  return {
    alertId: a.id,
    severity: a.severity,
    title: a.title,
    description: a.description,
    nodeId,
    system,
    timestamp: a.created_at ?? new Date().toISOString(),
    resolved: a.resolved,
  }
}

export interface UseIncidentsResult {
  incidents: Incident[]
  summary: IncidentSummary
  impactScore: number
  activeIncidents: Incident[]
  actions: IncidentActions
}

const correlatedIds = new Set<string>()

export function useIncidents(): UseIncidentsResult {
  const { data: rtAlerts } = useRealtimeAlerts(200)

  const [userActionsMap, setUserActionsMap] = useState<Record<string, {
    status: IncidentStatus
    acknowledgedAt: string | null
    resolvedAt: string | null
    timelineAdditions: IncidentEvent[]
  }>>({})

  const unresolvedAlerts = useMemo(
    () => rtAlerts.filter((a) => !a.resolved),
    [rtAlerts]
  )

  const correlationInputs = useMemo(
    () => unresolvedAlerts.map(alertToCorrelationInput),
    [unresolvedAlerts]
  )

  const autoIncidents = useMemo(() => {
    if (correlationInputs.length === 0) return []

    const groups = correlateAlerts(correlationInputs)
    const existingCorrelatedIds = new Set(correlatedIds)
    const isNewCorrelation = groups.some((g) =>
      g.alertIds.some((id) => !existingCorrelatedIds.has(id))
    )
    if (!isNewCorrelation) return []

    const newIncidents: Incident[] = []
    for (const group of groups) {
      const alreadyCorrelated = group.alertIds.some((id) => existingCorrelatedIds.has(id))
      if (alreadyCorrelated) continue

      const severity = group.severity
      const score = computeIncidentScore(severity, group.alertIds.length, group.affectedNodeIds.length)
      const now = new Date().toISOString()
      const id = generateId()
      const incident: Incident = {
        id,
        title: buildTitle(severity, group.correlationType, group.affectedNodeIds.length),
        description: buildDescription(group),
        status: "open",
        severity,
        score,
        alertIds: group.alertIds,
        affectedNodeIds: group.affectedNodeIds,
        affectedSystems: group.affectedSystems,
        timeline: [makeIncidentEvent(id, "created", `Incident created from ${group.alertIds.length} correlated alerts`)],
        correlationType: group.correlationType,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
        acknowledgedAt: null,
      }
      newIncidents.push(incident)

      for (const aid of group.alertIds) {
        correlatedIds.add(aid)
      }
    }
    return newIncidents
  }, [correlationInputs])

  const incidents: Incident[] = useMemo(() => {
    const merged: Incident[] = [...autoIncidents]
    for (const inc of merged) {
      const action = userActionsMap[inc.id]
      if (!action) continue
      inc.status = action.status
      if (action.acknowledgedAt) inc.acknowledgedAt = action.acknowledgedAt
      if (action.resolvedAt) inc.resolvedAt = action.resolvedAt
      inc.timeline = [...action.timelineAdditions, ...inc.timeline]
      inc.updatedAt = new Date().toISOString()
    }
    return merged
  }, [autoIncidents, userActionsMap])

  const acknowledge = useCallback((id: string) => {
    const event = makeIncidentEvent(id, "acknowledged", "Incident acknowledged by operator")
    setUserActionsMap((prev) => ({
      ...prev,
      [id]: {
        status: "acknowledged" as IncidentStatus,
        acknowledgedAt: new Date().toISOString(),
        resolvedAt: null,
        timelineAdditions: [event],
      },
    }))
  }, [])

  const startMitigation = useCallback((id: string) => {
    const event = makeIncidentEvent(id, "mitigation_started", "Mitigation actions initiated")
    setUserActionsMap((prev) => {
      const existing = prev[id]
      return {
        ...prev,
        [id]: {
          status: "mitigating" as IncidentStatus,
          acknowledgedAt: existing?.acknowledgedAt ?? null,
          resolvedAt: null,
          timelineAdditions: [...(existing?.timelineAdditions ?? []), event],
        },
      }
    })
  }, [])

  const resolve = useCallback((id: string) => {
    const event = makeIncidentEvent(id, "resolved", "Incident resolved — all correlated alerts cleared")
    setUserActionsMap((prev) => {
      const existing = prev[id]
      return {
        ...prev,
        [id]: {
          status: "resolved" as IncidentStatus,
          acknowledgedAt: existing?.acknowledgedAt ?? null,
          resolvedAt: new Date().toISOString(),
          timelineAdditions: [...(existing?.timelineAdditions ?? []), event],
        },
      }
    })
  }, [])

  const summary = useMemo(() => computeIncidentSummary(incidents), [incidents])
  const impactScore = useMemo(() => computeIncidentImpactScore(summary), [summary])
  const activeIncidents = useMemo(() => incidents.filter((i) => i.status !== "resolved"), [incidents])

  return {
    incidents,
    summary,
    impactScore,
    activeIncidents,
    actions: { acknowledge, startMitigation, resolve },
  }
}
