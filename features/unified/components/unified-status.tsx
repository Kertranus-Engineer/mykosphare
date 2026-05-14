"use client"

import { Brain, Share2, ScrollText, AlertTriangle, Activity, Gauge, Wifi, WifiOff, TrendingUp, TrendingDown, Siren, Wrench } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { CARD_HOVER, OPERATIONAL_STATUS } from "@/lib/styles/tokens"
import { IncidentSummaryBadge } from "@/features/incidents/components/incident-badge"
import { IncidentCard } from "@/features/incidents/components/incident-panel"
import { useIncidents } from "@/lib/incidents/use-incidents"
import type { OperationalStatus } from "@/lib/intelligence/types"

function SystemBar({ label, score, status, impact }: { label: string; score: number; status: OperationalStatus; impact: string }) {
  const meta = OPERATIONAL_STATUS[status] ?? OPERATIONAL_STATUS.critical
  const impactColor = impact === "critical" ? "text-red-500" : impact === "severe" ? "text-orange-500" : impact === "moderate" ? "text-amber-500" : "text-muted-foreground/50"
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 text-[10px] text-muted-foreground/70 font-medium">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", meta.bar)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("w-8 text-right text-[10px] tabular-nums", meta.color)}>{score}</span>
      <span className={cn("w-12 text-right text-[9px] capitalize", impactColor)}>{impact}</span>
    </div>
  )
}

export function UnifiedStatus() {
  const state = useUnifiedOperationalState()
  const { actions: incidentActions, activeIncidents } = useIncidents()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Unified Operations
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Cross-layer operational intelligence platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state.incidentSummary.totalIncidents > 0 && (
            <IncidentSummaryBadge
              openCount={state.incidentSummary.openIncidents}
              criticalCount={state.incidentSummary.criticalIncidents}
              totalCount={state.incidentSummary.totalIncidents}
            />
          )}
          {state.maintenanceSummary.pending > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1">
              <Wrench className="size-3 text-orange-500" />
              <span className="text-[10px] font-medium text-orange-500">{state.maintenanceSummary.pending} pending</span>
              {state.maintenanceSummary.critical > 0 && (
                <>
                  <span className="text-[10px] text-orange-500/50">·</span>
                  <span className="text-[10px] font-medium text-red-500">{state.maintenanceSummary.critical} critical</span>
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            {state.connected ? (
              <Wifi className="size-3 text-emerald-500/60 animate-pulse" />
            ) : (
              <WifiOff className="size-3 text-muted-foreground/40" />
            )}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {state.connected ? "ALL SYSTEMS LIVE" : "DEGRADED"}
            </span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="size-4 text-violet-500" />
              Cross-Layer Cohesion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex size-16 items-center justify-center rounded-xl border-2",
                state.crossLayer.overallCohesion >= 80
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : state.crossLayer.overallCohesion >= 60
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-red-500/30 bg-red-500/10"
              )}>
                <span className={cn(
                  "text-2xl font-bold tabular-nums",
                  state.crossLayer.overallCohesion >= 80 ? "text-emerald-500" : state.crossLayer.overallCohesion >= 60 ? "text-amber-500" : "text-red-500"
                )}>
                  {state.crossLayer.overallCohesion}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                  <Activity className="size-3" />
                  <span>Topology: {state.crossLayer.intelligenceTopologyCorrelation}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                  <ScrollText className="size-3" />
                  <span>Temporal: {state.crossLayer.temporalAlertCorrelation}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                  <AlertTriangle className="size-3" />
                  <span>{state.crossLayer.topologyNodesWithAlerts} nodes with alerts</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="size-4 text-cyan-500" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.systemHealth.map((sys) => (
              <SystemBar
                key={sys.system}
                label={sys.system}
                score={sys.score}
                status={sys.status}
                impact={sys.impact}
              />
            ))}
          </CardContent>
        </Card>

        <Card className={cn(CARD_HOVER, "lg:col-span-2")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Share2 className="size-4 text-emerald-500" />
              Augmented Topology Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {state.augmentedNodes.slice(0, 6).map((node) => {
                const meta = OPERATIONAL_STATUS[node.combinedStatus] ?? OPERATIONAL_STATUS.critical
                const hasAlert = node.activeAlertCount > 0
                return (
                  <div key={node.nodeId} className={cn(
                    "rounded-lg border p-2.5 flex items-center gap-2.5",
                    meta.bg,
                    meta.border,
                    hasAlert && "ring-1 ring-red-500/20"
                  )}>
                    <div className={cn("flex size-8 items-center justify-center rounded-lg", meta.bg)}>
                      <span className={cn("text-xs font-bold tabular-nums", meta.color)}>
                        {Math.round((node.healthScore + node.telemetryQuality + node.reliabilityScore) / 3)}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-foreground truncate">{node.label}</span>
                        {hasAlert && (
                          <AlertTriangle className="size-2.5 text-red-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
                        <span className="capitalize">{node.nodeType}</span>
                        <span className={cn("capitalize", meta.color)}>{node.combinedStatus}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {state.augmentedNodes.length > 6 && (
              <div className="mt-2 text-center text-[10px] text-muted-foreground/50">
                +{state.augmentedNodes.length - 6} more nodes
              </div>
            )}
            {state.augmentedNodes.length === 0 && (
              <div className="py-6 text-center text-[11px] text-muted-foreground/50">
                No topology nodes available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {activeIncidents.length > 0 && (
        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Siren className="size-4 text-red-500" />
              Active Incidents ({activeIncidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
              {activeIncidents.slice(0, 6).map((inc) => (
                <IncidentCard key={inc.id} incident={inc} actions={incidentActions} />
              ))}
            </div>
            {activeIncidents.length > 6 && (
              <div className="mt-2 text-center text-[10px] text-muted-foreground/50">
                +{activeIncidents.length - 6} more incidents
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {state.temporal.trends.slice(0, 3).map((trend) => {
          const isUp = trend.direction === "rising"
          const isDown = trend.direction === "falling"
          const trendColor = isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-blue-500"
          return (
            <Card key={trend.metric} className={cn(CARD_HOVER)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex size-8 items-center justify-center rounded-lg bg-muted/30", trendColor)}>
                    {isUp ? <TrendingUp className="size-4" /> : isDown ? <TrendingDown className="size-4" /> : <Activity className="size-4" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground capitalize">{trend.metric}</span>
                    <span className={cn("block text-[10px]", trendColor)}>
                      {trend.changePercent > 0 ? "+" : ""}{trend.changePercent}% · {trend.direction}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-bold tabular-nums text-foreground">{trend.currentValue}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
