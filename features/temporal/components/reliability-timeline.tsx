"use client"

import { Cpu, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { BehaviorMetric } from "@/lib/temporal/types"
import type { TrendDirection } from "@/lib/temporal/types"

const TREND_ICONS: Record<TrendDirection, typeof TrendingUp> = {
  rising: TrendingUp,
  falling: TrendingDown,
  stable: Minus,
  volatile: TrendingUp,
}

const TREND_COLORS: Record<TrendDirection, string> = {
  rising: "text-emerald-500",
  falling: "text-red-500",
  stable: "text-blue-500",
  volatile: "text-amber-500",
}

function MetricRow({ b }: { b: BehaviorMetric }) {
  const RelIcon = TREND_ICONS[b.reliabilityTrend] ?? Minus
  const UpIcon = TREND_ICONS[b.uptimeTrend] ?? Minus
  const AlertIcon = TREND_ICONS[b.alertFreqTrend] ?? Minus

  return (
    <div className="rounded-lg bg-muted/20 p-2.5">
      <span className="text-[10px] font-medium text-foreground capitalize mb-2 block">{b.metric}</span>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground/60">Reliability</span>
          <span className={cn("tabular-nums font-medium", TREND_COLORS[b.reliabilityTrend])}>{b.reliabilityScore}%</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground/60">Uptime</span>
          <span className={cn("tabular-nums font-medium", TREND_COLORS[b.uptimeTrend])}>{b.uptimeScore}s</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground/60">Alert Freq</span>
          <span className={cn("tabular-nums font-medium", b.alertFreqTrend === "rising" ? "text-amber-500" : b.alertFreqTrend === "falling" ? "text-emerald-500" : "text-muted-foreground/60")}>{b.alertFreqPerHour}/hr</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground/60">Packet Stability</span>
          <span className="tabular-nums font-medium text-foreground">{b.packetStability}%</span>
        </div>
      </div>
    </div>
  )
}

export function ReliabilityTimelineCard({ behavior }: { behavior: BehaviorMetric[] }) {
  if (behavior.length === 0) {
    return (
      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cpu className="size-4 text-violet-500" />
            Reliability Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-[11px] text-muted-foreground/60">Insufficient data</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cpu className="size-4 text-violet-500" />
          Reliability Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {behavior.slice(0, 1).map((b, i) => (
          <MetricRow key={i} b={b} />
        ))}
      </CardContent>
    </Card>
  )
}
