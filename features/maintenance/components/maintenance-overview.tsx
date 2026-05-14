"use client"

import { useMaintenance } from "@/lib/maintenance/use-maintenance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CARD_HOVER } from "@/lib/styles/tokens"
import { Wrench, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus, Gauge, BarChart3 } from "lucide-react"
import { MaintenanceCard, MaintenanceSummaryBadge, MttrBadge } from "./maintenance-card"
import { priorityToColor } from "@/lib/maintenance/scoring"

export function MaintenanceOverview() {
  const maint = useMaintenance()
  const { recommendations, summary, mttr, reliability, actions } = maint

  const active = recommendations.filter((r) => r.status !== "completed")
  const completed = recommendations.filter((r) => r.status === "completed")

  const TrendIcon = reliability.trend === "improving" ? TrendingUp : reliability.trend === "degrading" ? TrendingDown : Minus
  const trendColor = reliability.trend === "improving" ? "text-emerald-500" : reliability.trend === "degrading" ? "text-red-500" : "text-blue-500"

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Maintenance Intelligence
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Predictive maintenance recommendations and reliability analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MaintenanceSummaryBadge pending={summary.pending} critical={summary.critical} />
          <MttrBadge hours={mttr.averageResolutionHours} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="size-4 text-orange-500" />
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">{summary.pending + summary.inProgress}</span>
              <span className="text-[11px] text-muted-foreground/60 mb-1">of {summary.total}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/50">{summary.pending} pending</span>
              <span className="text-[10px] text-amber-500">{summary.inProgress} in progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="size-4 text-emerald-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold tabular-nums text-emerald-500">{summary.completed}</span>
              <span className="text-[11px] text-muted-foreground/60 mb-1">
                {summary.total > 0 ? `${Math.round((summary.completed / summary.total) * 100)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/50">{reliability.maintenanceCompletionRate}% completion rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-blue-500" />
              MTTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold tabular-nums text-foreground">{mttr.averageResolutionHours}</span>
              <span className="text-[11px] text-muted-foreground/60 mb-1">hours</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/50">Trend: </span>
              <span className={cn("text-[10px] capitalize", mttr.trend === "improving" ? "text-emerald-500" : mttr.trend === "degrading" ? "text-red-500" : "text-blue-500")}>{mttr.trend}</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className={cn("size-4", trendColor)} />
              Reliability Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className={cn("text-2xl font-bold tabular-nums", reliability.overallScore >= 75 ? "text-emerald-500" : reliability.overallScore >= 50 ? "text-amber-500" : "text-red-500")}>
                {reliability.overallScore}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground/50">MTBI: {(reliability.meanTimeBetweenIncidents / 3600000).toFixed(1)}h</span>
              <span className={cn("flex items-center gap-0.5 text-[10px]", trendColor)}>
                <TrendIcon className="size-3" />
                {reliability.trend}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.critical > 0 && (
        <Card className={cn(CARD_HOVER, "border-red-500/20")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-red-500" />
              Critical Recommendations ({summary.critical})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
            {recommendations.filter((r) => r.priority === "critical").map((rec) => (
              <MaintenanceCard
                key={rec.id}
                recommendation={rec}
                onSchedule={actions.schedule}
                onStart={actions.startWork}
                onComplete={actions.complete}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className={cn(CARD_HOVER, "lg:col-span-1")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="size-4 text-violet-500" />
              By Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(summary.bySource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/70 capitalize">{source.replace(/-/g, " ")}</span>
                <span className="text-[10px] font-medium tabular-nums text-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={cn(CARD_HOVER, "lg:col-span-3")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wrench className="size-4 text-amber-500" />
              All Recommendations ({active.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {active.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                {active.map((rec) => (
                  <MaintenanceCard
                    key={rec.id}
                    recommendation={rec}
                    onSchedule={actions.schedule}
                    onStart={actions.startWork}
                    onComplete={actions.complete}
                  />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <CheckCircle className="size-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-[11px] text-muted-foreground/50">No pending maintenance — all systems nominal</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {completed.length > 0 && (
        <Card className={cn(CARD_HOVER)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="size-4 text-emerald-500" />
              Completed ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {completed.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-2.5 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="size-3 text-emerald-500/60 shrink-0" />
                  <span className="text-[10px] text-muted-foreground/80 truncate">{rec.title}</span>
                </div>
                <span className="text-[9px] text-muted-foreground/40 shrink-0">{rec.source.replace(/-/g, " ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
