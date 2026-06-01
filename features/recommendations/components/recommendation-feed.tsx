"use client"

import { memo } from "react"
import {
  CircleCheck,
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  Clock,
  Thermometer,
  Droplets,
  Camera,
  Gauge,
  Cpu,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import {
  PRIORITY_COLORS,
  PRIORITY_DOT,
  type Recommendation,
  type RecommendationPriority,
} from "@/lib/recommendations/recommendation-engine"
import type { TrendCategory } from "@/lib/trends/trend-engine"

const CATEGORY_ICONS: Record<TrendCategory, React.ComponentType<{ className?: string }>> = {
  temperature: Thermometer,
  humidity: Droplets,
  co2: Gauge,
  capture: Camera,
  correlation: Gauge,
  system: Cpu,
}

const PRIORITY_ICONS = {
  low: CircleCheck,
  medium: AlertTriangle,
  high: ShieldAlert,
}

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
  } catch {
    return iso
  }
}

const RecommendationRow = memo(function RecommendationRow({ recommendation }: { recommendation: Recommendation }) {
  const priorityColor = PRIORITY_COLORS[recommendation.priority]
  const priorityDot = PRIORITY_DOT[recommendation.priority]
  const PriorityIcon = PRIORITY_ICONS[recommendation.priority]
  const CategoryIcon = CATEGORY_ICONS[recommendation.category]
  const priorityLabel = PRIORITY_LABELS[recommendation.priority]

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/10 border-b border-foreground/5 last:border-b-0">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20">
        <CategoryIcon className="size-3 text-muted-foreground/50" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full shrink-0", priorityDot)} />
          <span className={cn("text-[11px] font-semibold truncate", priorityColor)}>
            {recommendation.title}
          </span>
        </div>
        <p className="text-[10px] text-foreground/55 leading-relaxed line-clamp-3">
          {recommendation.description}
        </p>
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/40 mt-0.5">
          <Clock className="size-2.5" />
          <span className="tabular-nums">{formatTimestamp(recommendation.timestamp)}</span>
          <span className="text-muted-foreground/20">·</span>
          <PriorityIcon className="size-2.5" />
          <span className="uppercase tracking-wider">{priorityLabel} priority</span>
        </div>
      </div>
    </div>
  )
})

interface RecommendationFeedProps {
  recommendations: Recommendation[]
  limit?: number
  emptyMessage?: string
}

export const RecommendationFeed = memo(function RecommendationFeed({
  recommendations,
  limit = 50,
  emptyMessage = "No recommendations at this time",
}: RecommendationFeedProps) {
  const display = recommendations.slice(0, limit)

  if (display.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Lightbulb}
            title={emptyMessage}
            description="Recommendations are generated when environmental trends require operational action."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="size-4 text-muted-foreground" />
          Recommendations
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {recommendations.length} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {display.map((rec) => (
            <RecommendationRow key={rec.id} recommendation={rec} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
