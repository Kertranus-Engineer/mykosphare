"use client"

import { memo } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Clock,
  Thermometer,
  Droplets,
  Camera,
  Gauge,
  Cpu,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  DIRECTION_COLORS,
  DIRECTION_BG,
  type Trend,
  type TrendCategory,
} from "@/lib/trends/trend-engine"

const DIRECTION_ICONS = {
  improving: TrendingUp,
  stable: Minus,
  degrading: TrendingDown,
}

const DIRECTION_LABELS = {
  improving: "Improving",
  stable: "Stable",
  degrading: "Degrading",
} as const

const CATEGORY_ICONS: Record<TrendCategory, React.ComponentType<{ className?: string }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  co2: Gauge,
  capture: Camera,
  correlation: Gauge,
  system: Cpu,
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

interface LatestTrendCardProps {
  trend: Trend | null
}

export const LatestTrendCard = memo(function LatestTrendCard({
  trend,
}: LatestTrendCardProps) {
  if (!trend) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-muted-foreground" />
            Latest Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Activity className="size-5 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40">No trends detected yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const directionColor = DIRECTION_COLORS[trend.direction]
  const directionBg = DIRECTION_BG[trend.direction]
  const DirectionIcon = DIRECTION_ICONS[trend.direction]
  const CategoryIcon = CATEGORY_ICONS[trend.category]
  const directionLabel = DIRECTION_LABELS[trend.direction]
  const confWidth = `${trend.confidence}%`

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="size-4 text-muted-foreground" />
          Latest Trend
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {formatTimestamp(trend.endTime)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("flex items-start gap-3 rounded-lg border p-3", directionBg)}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/20">
            <CategoryIcon className={cn("size-4", directionColor)} />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold", directionColor)}>
                {trend.title}
              </span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
                trend.direction === "improving" ? "bg-emerald-500/15 text-emerald-500" :
                trend.direction === "stable" ? "bg-sky-500/15 text-sky-500" :
                "bg-amber-500/15 text-amber-500",
              )}>
                {directionLabel}
              </span>
            </div>
            <p className="text-[11px] text-foreground/65 leading-relaxed">
              {trend.summary}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <DirectionIcon className="size-3 text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/50">{directionLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground/50">Confidence</span>
                <div className="h-1 w-14 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      trend.direction === "improving" ? "bg-emerald-500/60" :
                      trend.direction === "stable" ? "bg-sky-500/60" :
                      "bg-amber-500/60",
                    )}
                    style={{ width: confWidth }}
                  />
                </div>
                <span className="text-[9px] font-medium tabular-nums text-foreground/60">{trend.confidence}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-2.5 text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/50">{formatTimestamp(trend.endTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
