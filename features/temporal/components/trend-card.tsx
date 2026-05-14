"use client"

import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TrendAnalysis } from "@/lib/temporal/types"
import type { TrendDirection } from "@/lib/temporal/types"

const DIRECTION_META: Record<TrendDirection, { icon: typeof TrendingUp; color: string; bg: string }> = {
  rising: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  falling: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
  stable: { icon: Minus, color: "text-blue-500", bg: "bg-blue-500/10" },
  volatile: { icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
}

function TrendSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 80
  const h = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} className="opacity-70" />
    </svg>
  )
}

export function TrendCard({
  trend,
  sparklineValues,
}: {
  trend: TrendAnalysis
  sparklineValues?: number[]
}) {
  const meta = DIRECTION_META[trend.direction] ?? DIRECTION_META.stable
  const DirIcon = meta.icon

  return (
    <Card size="sm" className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardContent className="flex items-center gap-3">
        {sparklineValues && sparklineValues.length > 0 && (
          <TrendSparkline values={sparklineValues} color={meta.color.replace("text-", "#")} />
        )}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={cn("flex size-5 items-center justify-center rounded", meta.bg)}>
              <DirIcon className={cn("size-3", meta.color)} />
            </div>
            <span className="text-xs font-medium text-foreground capitalize">{trend.metric}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {trend.currentValue}
            </span>
            <span className={cn("text-[10px] tabular-nums", meta.color)}>
              {trend.changePercent > 0 ? "+" : ""}{trend.changePercent}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/50">
            <span>slope: {trend.slope}</span>
            <span>vol: {trend.volatility}</span>
            <span>{trend.samples} pts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
