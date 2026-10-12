"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { indicatorStatusEs } from "../i18n"
import type { DataSource, MetricReading } from "../use-mobile-telemetry"
import { Skeleton, Sparkline } from "./primitives"

interface MetricTileProps {
  icon: LucideIcon
  label: string
  unit: string
  decimals: number
  reading: MetricReading
  source: DataSource
  dimmed: boolean
  loading: boolean
  /** Real in-session samples for the sparkline. */
  series?: number[]
  className?: string
}

export function MetricTile({
  icon: Icon,
  label,
  unit,
  decimals,
  reading,
  source,
  dimmed,
  loading,
  series,
  className,
}: MetricTileProps) {
  const simulated = source === "simulated"
  const hasValue = reading.value !== null
  const TrendIcon = reading.trend === "up" ? ArrowUpRight : reading.trend === "down" ? ArrowDownRight : Minus

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border bg-card/80 p-3 min-[360px]:p-3.5 shadow-[0_0_24px_-12px] shadow-emerald-500/20",
        simulated ? "border-dashed border-amber-500/40" : "border-border",
        dimmed && "opacity-60",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 min-[360px]:gap-2">
        <span className="flex size-7 shrink-0 min-[360px]:size-8 items-center justify-center rounded-lg bg-muted/70">
          <Icon className="size-4 text-cyan-600 dark:text-cyan-400" aria-hidden />
        </span>
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</span>
      </div>

      {loading ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <div className="flex items-baseline gap-1">
          <span
            className="text-[1.75rem] font-bold leading-none tracking-tight tabular-nums text-foreground min-[360px]:text-[2rem]"
            aria-label={hasValue ? `${label}: ${reading.value!.toFixed(decimals)} ${unit}` : `${label}: sin dato`}
          >
            {hasValue ? reading.value!.toFixed(decimals) : "--"}
          </span>
          {hasValue && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        </div>
      )}

      <div className="flex min-h-5 items-center justify-between gap-2 text-xs">
        {hasValue && reading.status ? (
          <span className={cn("truncate font-semibold", reading.statusColor)}>{indicatorStatusEs(reading.status)}</span>
        ) : (
          <span className="text-muted-foreground/70">{loading ? "" : "Sin lectura"}</span>
        )}
        {hasValue && !dimmed && reading.trend !== "stable" && (
          <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums text-muted-foreground">
            <TrendIcon className="size-3.5" aria-hidden />
            {reading.delta > 0 ? "+" : ""}
            {reading.delta.toFixed(1)}
          </span>
        )}
      </div>

      {series && series.length >= 3 && (
        <div className={cn(simulated ? "text-amber-700 dark:text-amber-400/70" : "text-emerald-600 dark:text-emerald-400/70")}>
          <Sparkline values={series} />
        </div>
      )}
    </div>
  )
}
