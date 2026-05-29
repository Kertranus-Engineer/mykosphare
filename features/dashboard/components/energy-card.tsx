"use client"

import { memo } from "react"
import { Zap, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardTelemetry } from "@/lib/useTelemetry"

const CLP_PER_KWH = 95
const OPERATIONAL_HOURS_PER_DAY = 6
const EFFICIENCY_BASE = 92

interface EnergyCardProps {
  tel: DashboardTelemetry
}

export const EnergyCard = memo(function EnergyCard({ tel }: EnergyCardProps) {
  const kwh = tel.energyUsage.value
  const hasData = tel.hasRealData && kwh > 0

  const costPerHour = Math.round(kwh * CLP_PER_KWH)
  const dailyCost = Math.round(kwh * OPERATIONAL_HOURS_PER_DAY * CLP_PER_KWH)
  const monthlyCost = Math.round(dailyCost * 30)
  const efficiency = hasData ? EFFICIENCY_BASE : 0
  const trendDelta = tel.energyUsage.delta
  const trendLabel = trendDelta > 0.05 ? "rising"
    : trendDelta < -0.05 ? "falling"
    : "stable"
  const TrendIcon = trendDelta > 0.05 ? TrendingUp : trendDelta < -0.05 ? TrendingDown : TrendingUp

  return (
    <Card
      size="sm"
      className={cn(
        "flex-1 transition-all duration-300 relative overflow-hidden",
        "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
        hasData && "shadow-[0_0_12px_-4px] shadow-amber-500/5"
      )}
    >
      {hasData && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,158,11,0.3) 2px, rgba(245,158,11,0.3) 4px)`,
            animation: "shift-gradient 3s linear infinite",
            backgroundSize: "100% 4px",
          }}
        />
      )}
      {hasData && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)",
            animation: "sweep-line 4s ease-in-out infinite",
          }}
        />
      )}

      <CardContent className="flex flex-col gap-3 relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="relative flex size-10 items-center justify-center rounded-lg bg-muted">
            <Zap className="size-[20px] text-amber-500" />
            <div className="absolute -right-0.5 -top-0.5">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-500/60 font-medium">
            <TrendIcon className="size-3" />
            {trendLabel}
          </div>
        </div>

        {/* Primary value */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[2.25rem] font-bold tracking-tight tabular-nums"
              style={{ color: "var(--kpi-value)", fontVariantNumeric: "tabular-nums", lineHeight: "normal" }}>
              {hasData ? kwh.toFixed(1) : "--"}
            </span>
            <span className="text-[1.2rem] font-normal text-foreground/40">kWh</span>
          </div>
          <span className="text-[12px] font-medium text-foreground/45 tracking-wide">Energy Usage</span>
        </div>

        {/* Cost row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/30 px-2 py-1.5">
            <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Now</div>
            <div className="text-[11px] font-semibold tabular-nums text-amber-500/80">
              {hasData ? `$${costPerHour.toLocaleString()} CLP` : "--"}
              <span className="text-[8px] font-normal text-amber-500/40"> /hr</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/30 px-2 py-1.5">
            <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Projected</div>
            <div className="text-[11px] font-semibold tabular-nums text-amber-500/80">
              {hasData ? `$${monthlyCost.toLocaleString()} CLP` : "--"}
            </div>
            <div className="text-[8px] text-muted-foreground/30 mt-0.5">
              est. monthly · {OPERATIONAL_HOURS_PER_DAY}h/day
            </div>
          </div>
        </div>

        {/* Efficiency bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-foreground/50 uppercase tracking-wider font-medium">Efficiency</span>
            <span className={cn("font-semibold tabular-nums",
              efficiency >= 90 ? "text-emerald-500" : efficiency >= 70 ? "text-amber-500" : "text-red-500"
            )}>
              {hasData ? `${efficiency}%` : "--"}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${efficiency}%`, background: "linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.3))" }}
            />
          </div>
          {hasData && (
            <div className="text-[8px] text-emerald-500/60 text-right font-medium tracking-wider">
              {efficiency >= 90 ? "OPTIMAL" : efficiency >= 70 ? "DEGRADED" : "INEFFICIENT"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}, (prev, next) => {
  return prev.tel.energyUsage.value === next.tel.energyUsage.value
    && prev.tel.energyUsage.trend === next.tel.energyUsage.trend
    && prev.tel.hasRealData === next.tel.hasRealData
})
