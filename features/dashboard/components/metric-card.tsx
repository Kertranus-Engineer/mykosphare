"use client"

import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp, Activity } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: string
  trend: "up" | "down" | "stable"
  trendLabel: string
  live?: boolean
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  live = true,
}: MetricCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-500"
        : "text-muted-foreground"

  return (
    <Card
      size="sm"
      className="flex-1 transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10"
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="relative flex size-8 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
            {live && (
              <div className="absolute -right-0.5 -top-0.5">
                <div className="size-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {live && (
              <Activity className="size-2.5 text-muted-foreground/20 animate-pulse" />
            )}
            {trend !== "stable" && (
              <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                <TrendIcon className="size-3" />
                <span>{trendLabel}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums transition-all duration-300">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
