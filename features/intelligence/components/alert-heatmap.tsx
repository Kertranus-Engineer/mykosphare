"use client"

import { BarChart3, AlertTriangle, Info, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { AlertDensityMetrics, AlertDurationMetrics } from "@/lib/intelligence/types"

function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return `${hours}h ${remaining}m`
}

function Bar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.max(ratio * 100, 1)}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground/60">
        {Math.round(ratio * 100)}%
      </span>
    </div>
  )
}

export function AlertHeatmap({
  density,
  durations,
}: {
  density: AlertDensityMetrics
  durations: AlertDurationMetrics
}) {
  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="size-4 text-amber-500" />
          Alert Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/20 p-2.5 text-center">
            <span className="text-lg font-bold tabular-nums text-foreground">{density.totalAlerts}</span>
            <span className="block text-[9px] text-muted-foreground/50 mt-0.5">Total</span>
          </div>
          <div className="rounded-lg bg-muted/20 p-2.5 text-center">
            <span className="text-lg font-bold tabular-nums text-foreground">{density.alertsPerHour}</span>
            <span className="block text-[9px] text-muted-foreground/50 mt-0.5">/hr</span>
          </div>
          <div className="rounded-lg bg-muted/20 p-2.5 text-center">
            <span className="text-lg font-bold tabular-nums text-foreground">{formatDuration(durations.avgResolutionMs)}</span>
            <span className="block text-[9px] text-muted-foreground/50 mt-0.5">Avg Resolve</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <XCircle className="size-3 text-red-500/70" />
            Critical
            <Bar ratio={density.criticalRatio} color="bg-red-500" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <AlertTriangle className="size-3 text-amber-500/70" />
            Warning
            <Bar ratio={density.warningRatio} color="bg-amber-500" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <Info className="size-3 text-blue-500/70" />
            Info
            <Bar ratio={density.infoRatio} color="bg-blue-500" />
          </div>
        </div>

        {durations.longestActive !== null && (
          <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-2.5">
            <span className="text-[10px] text-red-500/70 font-medium">Longest Active Alert</span>
            <span className="block text-xs tabular-nums text-foreground mt-0.5">
              {formatDuration(durations.longestActive)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
