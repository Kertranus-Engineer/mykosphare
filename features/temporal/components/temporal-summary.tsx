"use client"

import { ScrollText, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TemporalSummary, TrendDirection } from "@/lib/temporal/types"

const DIR_COLORS: Record<TrendDirection, string> = {
  rising: "text-amber-500",
  falling: "text-emerald-500",
  stable: "text-blue-500",
  volatile: "text-red-500",
}

const DIR_ICONS: Record<TrendDirection, typeof TrendingUp> = {
  rising: TrendingUp,
  falling: TrendingDown,
  stable: Minus,
  volatile: TrendingUp,
}

const formatDelta = (value: number, decimals = 1) =>
  `${value > 0 ? "+" : ""}${value.toFixed(decimals)}`

export function TemporalSummaryCard({ summary, connected }: { summary: TemporalSummary; connected: boolean }) {
  const forecastConfidence = summary.forecasts.length > 0
    ? Math.round(summary.forecasts.reduce((s, f) => s + (100 - f.projectedInstability), 0) / summary.forecasts.length)
    : 96

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ScrollText className="size-4 text-cyan-500" />
          Temporal Summary
          <span className="ml-auto flex items-center gap-1 text-[9px] font-medium text-cyan-500/70 border border-cyan-500/20 bg-cyan-500/10 rounded-full px-2 py-0.5">
            <Activity className="size-2.5" />
            {forecastConfidence}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {summary.trends.slice(0, 4).map((t) => {
            const DirIcon = DIR_ICONS[t.direction] ?? Minus
            return (
              <div key={t.metric} className="rounded-lg bg-muted/20 p-2">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mb-0.5">
                  <DirIcon className={cn("size-2.5", DIR_COLORS[t.direction])} />
                  <span className="capitalize">{t.metric}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground">{t.currentValue}</span>
                <span className={cn("text-[9px] tabular-nums ml-1", DIR_COLORS[t.direction])}>
                  {formatDelta(t.changePercent)}%
                </span>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {summary.comparativeWindows.map((w) => (
            <div key={w.window} className="rounded-lg bg-muted/20 px-2 py-1.5 flex items-center justify-between">
              <span className="text-muted-foreground/60">{w.window}</span>
              <span className="tabular-nums text-foreground">{w.stabilityPct.toFixed(1)}% stable</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/20 px-2.5 py-1.5">
          <span className="text-[9px] text-muted-foreground/40">Worst: {summary.worstMetric}</span>
          <span className="text-[9px] text-muted-foreground/40">Best: {summary.bestMetric}</span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-muted-foreground/40">
          <span>Generated {new Date(summary.generatedAt).toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
