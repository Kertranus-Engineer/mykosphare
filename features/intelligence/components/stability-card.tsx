"use client"

import { Activity, Clock, Waves } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { StabilityIndex } from "@/lib/intelligence/types"

const STATUS_COLORS: Record<string, string> = {
  optimal: "text-emerald-500",
  stable: "text-blue-500",
  degraded: "text-amber-500",
  unstable: "text-orange-500",
  critical: "text-red-500",
}

const STATUS_BG: Record<string, string> = {
  optimal: "bg-emerald-500/10 border-emerald-500/20",
  stable: "bg-blue-500/10 border-blue-500/20",
  degraded: "bg-amber-500/10 border-amber-500/20",
  unstable: "bg-orange-500/10 border-orange-500/20",
  critical: "bg-red-500/10 border-red-500/20",
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600_000)
  const mins = Math.floor((ms % 3600_000) / 60_000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function StabilityCard({ stability }: { stability: StabilityIndex }) {
  const color = STATUS_COLORS[stability.status] ?? "text-muted-foreground"
  const bg = STATUS_BG[stability.status] ?? "bg-muted/20 border-border/40"

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="size-4 text-cyan-500" />
          System Stability
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className={cn("flex items-center justify-between rounded-lg border p-3", bg)}>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-2xl font-bold tabular-nums", color)}>{stability.score}</span>
              <span className="text-xs text-muted-foreground/60">/ 100</span>
            </div>
            <span className={cn("text-[11px] font-medium capitalize", color)}>{stability.status}</span>
          </div>
          <div className="h-14 w-14 rounded-full bg-muted/30 flex items-center justify-center">
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold tabular-nums",
                stability.telemetryStability >= 80 ? "bg-emerald-500/20 text-emerald-500" : stability.telemetryStability >= 50 ? "bg-amber-500/20 text-amber-500" : "bg-red-500/20 text-red-500"
              )}
            >
              {stability.telemetryStability}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mb-1">
              <Clock className="size-3" />
              Alert-Free
            </div>
            <span className="text-sm font-medium tabular-nums text-foreground">
              {formatDuration(stability.alertFreeDuration)}
            </span>
          </div>
          <div className="rounded-lg bg-muted/20 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mb-1">
              <Waves className="size-3" />
              Fluctuation
            </div>
            <span className="text-sm font-medium tabular-nums text-foreground">
              {stability.fluctuationRate}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
