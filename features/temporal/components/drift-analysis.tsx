"use client"

import { ArrowRight, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DriftAnalysis, DriftMetric } from "@/lib/temporal/types"

function DriftBar({ metric }: { metric: DriftMetric }) {
  const capped = Math.min(metric.driftPercent, 50)
  const barWidth = (capped / 50) * 100
  const color = metric.significant
    ? metric.direction === "rising"
      ? "bg-amber-500"
      : "bg-red-500"
    : "bg-blue-500/50"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground/70 capitalize">{metric.metric}</span>
        <span className={cn("tabular-nums", metric.significant ? "text-amber-500" : "text-muted-foreground/50")}>
          {metric.driftPercent}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] tabular-nums text-muted-foreground/50 w-16 text-right">{metric.baselineMean}</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${barWidth}%` }} />
        </div>
        <span className="text-[9px] tabular-nums text-muted-foreground/50 w-16">{metric.currentMean}</span>
      </div>
    </div>
  )
}

export function DriftAnalysisCard({ drifts }: { drifts: DriftAnalysis[] }) {
  if (drifts.length === 0) {
    return (
      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowRight className="size-4 text-violet-500" />
            Environmental Drift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-[11px] text-muted-foreground/60">Insufficient data for drift analysis</span>
        </CardContent>
      </Card>
    )
  }

  const latest = drifts[drifts.length - 1]

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowRight className="size-4 text-violet-500" />
          Environmental Drift
          {latest.significantChanges > 0 && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] text-amber-500">
              <AlertTriangle className="size-2.5" />
              {latest.significantChanges} change{latest.significantChanges > 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {drifts.slice(-2).map((drift) => (
          <div key={drift.window}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-muted-foreground/70">{drift.window} drift</span>
              <span className={cn("text-[10px] tabular-nums", drift.overallDrift > 5 ? "text-amber-500" : "text-muted-foreground/50")}>
                {drift.overallDrift}% overall
              </span>
            </div>
            <div className="space-y-2">
              {drift.metrics.map((m) => (
                <DriftBar key={m.metric} metric={m} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
