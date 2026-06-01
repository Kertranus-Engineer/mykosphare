"use client"

import { memo } from "react"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Droplets,
  Camera,
  Gauge,
  Cpu,
  Clock,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
  DIRECTION_COLORS,
  DIRECTION_DOT,
  type Trend,
  type TrendCategory,
} from "@/lib/trends/trend-engine"

const CATEGORY_ICONS: Record<TrendCategory, React.ComponentType<{ className?: string }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  co2: Gauge,
  capture: Camera,
  correlation: Gauge,
  system: Cpu,
}

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

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return iso
  }
}

const TrendRow = memo(function TrendRow({ trend }: { trend: Trend }) {
  const directionColor = DIRECTION_COLORS[trend.direction]
  const directionDot = DIRECTION_DOT[trend.direction]
  const DirectionIcon = DIRECTION_ICONS[trend.direction]
  const CategoryIcon = CATEGORY_ICONS[trend.category]
  const directionLabel = DIRECTION_LABELS[trend.direction]

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 border-b border-foreground/5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20">
        <CategoryIcon className="size-3 text-muted-foreground/50" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full shrink-0", directionDot)} />
          <span className={cn("text-[11px] font-semibold truncate", directionColor)}>
            {trend.title}
          </span>
        </div>
        <p className="text-[10px] text-foreground/55 leading-relaxed line-clamp-2">
          {trend.summary}
        </p>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40 mt-0.5">
          <Clock className="size-2.5" />
          <span className="tabular-nums">{formatTimestamp(trend.endTime)}</span>
          <span className="text-muted-foreground/20">·</span>
          <DirectionIcon className="size-2.5" />
          <span className="uppercase tracking-wider">{directionLabel}</span>
          <span className="text-muted-foreground/20">·</span>
          <Activity className="size-2.5" />
          <span>{trend.confidence}% confidence</span>
          {trend.observationCount > 0 && (
            <>
              <span className="text-muted-foreground/20">·</span>
              <span>{trend.observationCount} obs</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

interface TrendFeedProps {
  trends: Trend[]
  limit?: number
  emptyMessage?: string
}

export const TrendFeed = memo(function TrendFeed({
  trends,
  limit = 50,
  emptyMessage = "No trends detected",
}: TrendFeedProps) {
  const display = trends.slice(0, limit)

  if (display.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Activity}
            title={emptyMessage}
            description="Trends emerge from comparing observation patterns across time windows."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="size-4 text-muted-foreground" />
          Trends
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {trends.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {display.map((trend) => (
            <TrendRow key={trend.id} trend={trend} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
