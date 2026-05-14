"use client"

import { useMemo } from "react"
import { useTopology } from "@/lib/topology/use-topology"
import { useOperationalIntelligence } from "@/lib/intelligence/use-intelligence"
import { useTemporalIntelligence } from "@/lib/temporal/use-temporal"
import { useRealtimeAlerts } from "@/lib/realtime/subscriptions"
import { useIncidents } from "@/lib/incidents/use-incidents"
import { useMaintenance } from "@/lib/maintenance/use-maintenance"
import { useTwin } from "@/lib/twin/use-twin"
import { useCommands } from "@/lib/commands/use-commands"
import { computeUnifiedState } from "./engine"
import type { UnifiedOperationalState } from "./types"
import type { SignalActivity } from "@/lib/topology/types"

export interface UnifiedResult extends UnifiedOperationalState {
  activities: SignalActivity[]
}

export function useUnifiedOperationalState(
  canvasWidth = 640,
  canvasHeight = 480
): UnifiedResult {
  const { graph, activities, connected: topologyConnected } = useTopology(canvasWidth, canvasHeight)
  const intelligence = useOperationalIntelligence()
  const temporal = useTemporalIntelligence()
  const { data: alerts } = useRealtimeAlerts(100)
  const { incidents, summary: incidentSummary, impactScore: incidentImpactScore } = useIncidents()
  const cmds = useCommands()

  const connected = topologyConnected && intelligence.connected && temporal.connected

  const maint = useMaintenance({
    incidents,
    drifts: temporal.drifts,
    reliability: intelligence.reliability,
    alertDensity: intelligence.alertDensity,
  })

  const twinActiveAlerts = useMemo(() => alerts.some((a) => !a.resolved), [alerts])
  const twinAvgDeviceHealth = useMemo(() =>
    graph.nodes.length > 0
      ? Math.round(graph.nodes.reduce((s, n) => s + n.health, 0) / graph.nodes.length)
      : 85,
  [graph.nodes])

  const twin = useTwin({
    activeAlerts: twinActiveAlerts,
    activeIncidents: incidentSummary.openIncidents > 0,
    maintenanceTasks: maint.summary.pending > 0,
    avgDeviceHealth: twinAvgDeviceHealth,
  })

  const unifiedState = useMemo(() => {
    return computeUnifiedState(
      graph,
      intelligence,
      temporal,
      alerts.map((a) => ({
        title: a.title,
        description: a.description,
        severity: a.severity,
        resolved: a.resolved,
      })),
      incidents,
      incidentSummary,
      incidentImpactScore,
      maint.recommendations,
      maint.summary,
      maint.mttr,
      maint.reliability,
      twin.chamberState,
      twin.health,
      cmds.commands,
      cmds.activeCount,
      connected
    )
  }, [graph, intelligence, temporal, alerts, incidents, incidentSummary, incidentImpactScore, maint.recommendations, maint.summary, maint.mttr, maint.reliability, twin.chamberState, twin.health, cmds.commands, cmds.activeCount, connected])

  return useMemo(() => ({ ...unifiedState, activities }), [unifiedState, activities])
}
