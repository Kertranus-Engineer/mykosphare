"use client"

import { memo } from "react"
import {
  Lightbulb,
  CircleCheck,
  AlertTriangle,
  ShieldAlert,
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
  PRIORITY_COLORS,
  PRIORITY_BG,
  type Recommendation,
  type RecommendationPriority,
} from "@/lib/recommendations/recommendation-engine"
import type { TrendCategory } from "@/lib/trends/trend-engine"

const PRIORITY_ICONS: Record<RecommendationPriority, React.ComponentType<{ className?: string }>> = {
  low: CircleCheck,
  medium: AlertTriangle,
  high: ShieldAlert,
}

const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
}

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

interface LatestRecommendationCardProps {
  recommendation: Recommendation | null
}

export const LatestRecommendationCard = memo(function LatestRecommendationCard({
  recommendation,
}: LatestRecommendationCardProps) {
  if (!recommendation) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="size-4 text-muted-foreground" />
            Latest Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Lightbulb className="size-5 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40">No recommendations yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const priorityColor = PRIORITY_COLORS[recommendation.priority]
  const priorityBg = PRIORITY_BG[recommendation.priority]
  const PriorityIcon = PRIORITY_ICONS[recommendation.priority]
  const CategoryIcon = CATEGORY_ICONS[recommendation.category]
  const priorityLabel = PRIORITY_LABELS[recommendation.priority]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="size-4 text-muted-foreground" />
          Latest Recommendation
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {formatTimestamp(recommendation.timestamp)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("flex items-start gap-3 rounded-lg border p-3", priorityBg)}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/20">
            <CategoryIcon className={cn("size-4", priorityColor)} />
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold", priorityColor)}>
                {recommendation.title}
              </span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
                recommendation.priority === "low" ? "bg-sky-500/15 text-sky-500" :
                recommendation.priority === "medium" ? "bg-amber-500/15 text-amber-500" :
                "bg-red-500/15 text-red-500",
              )}>
                {priorityLabel}
              </span>
            </div>
            <p className="text-[11px] text-foreground/65 leading-relaxed">
              {recommendation.description}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <PriorityIcon className="size-3 text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/50">{priorityLabel} priority</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-2.5 text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/50">{formatTimestamp(recommendation.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
