"use client"

import { memo } from "react"
import { Heart, Activity, Camera, Gauge, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TwinHealthScore } from "@/lib/twin/cultivation-profile"

function healthColor(value: number): string {
  if (value >= 80) return "text-emerald-500"
  if (value >= 50) return "text-amber-500"
  return "text-red-500"
}

function healthBarColor(value: number): string {
  if (value >= 80) return "bg-emerald-500"
  if (value >= 50) return "bg-amber-500"
  return "bg-red-500"
}

function healthLabel(value: number): string {
  if (value >= 80) return "Healthy"
  if (value >= 50) return "Degraded"
  return "Critical"
}

interface TwinHealthScoreCardProps {
  health: TwinHealthScore
}

export const TwinHealthScoreCard = memo(function TwinHealthScoreCard({
  health,
}: TwinHealthScoreCardProps) {
  const overallWidth = `${health.overall}%`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Heart className="size-4 text-muted-foreground" />
          Twin Health
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted/10 ring-2 ring-offset-2 ring-offset-background"
            style={{ "--tw-ring-color": health.overall >= 80 ? "rgb(16 185 129 / 0.3)" : health.overall >= 50 ? "rgb(245 158 11 / 0.3)" : "rgb(239 68 68 / 0.3)" } as React.CSSProperties}>
            <span className={cn("text-xl font-bold tabular-nums", healthColor(health.overall))}>
              {health.overall}
            </span>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-semibold", healthColor(health.overall))}>
                {healthLabel(health.overall)}
              </span>
              <span className="text-[10px] text-muted-foreground/40">0-100%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", healthBarColor(health.overall))}
                style={{ width: overallWidth }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
            <Activity className="size-3.5 text-sky-500/60 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground/50">Telemetry</span>
              <span className="text-xs font-bold tabular-nums text-foreground/70">
                {health.telemetryAvailability}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
            <Camera className="size-3.5 text-violet-500/60 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground/50">Captures</span>
              <span className="text-xs font-bold tabular-nums text-foreground/70">
                {health.captureAvailability}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
            <Gauge className="size-3.5 text-amber-500/60 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground/50">Correlation</span>
              <span className="text-xs font-bold tabular-nums text-foreground/70">
                {health.correlationQuality}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2">
            <ShieldCheck className="size-3.5 text-emerald-500/60 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] text-muted-foreground/50">Validation</span>
              <span className="text-xs font-bold tabular-nums text-foreground/70">
                {health.validationQuality}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
