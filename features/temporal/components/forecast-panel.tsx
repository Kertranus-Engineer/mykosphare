"use client"

import { TrendingUp, AlertTriangle, Gauge } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Forecast } from "@/lib/temporal/types"

function ForecastRow({ forecast }: { forecast: Forecast }) {
  const breachRisk = forecast.breachProbability > 50
  const instability = forecast.projectedInstability > 50

  return (
    <div className="rounded-lg bg-muted/20 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-foreground capitalize">{forecast.metric}</span>
        <span className="text-[9px] text-muted-foreground/50">{forecast.horizon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tabular-nums text-foreground">{forecast.projectedNext}</span>
        <span className={cn("text-[10px] tabular-nums", forecast.projectedChange > 0 ? "text-amber-500" : forecast.projectedChange < 0 ? "text-emerald-500" : "text-muted-foreground/50")}>
          {forecast.projectedChange > 0 ? "+" : ""}{forecast.projectedChange}%
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Gauge className={cn("size-2.5", instability ? "text-amber-500" : "text-muted-foreground/40")} />
          <span className={cn("text-[9px] tabular-nums", instability ? "text-amber-500" : "text-muted-foreground/50")}>
            instability {forecast.projectedInstability}%
          </span>
        </div>
        {forecast.breachProbability > 0 && (
          <div className="flex items-center gap-1">
            <AlertTriangle className={cn("size-2.5", breachRisk ? "text-red-500" : "text-muted-foreground/40")} />
            <span className={cn("text-[9px] tabular-nums", breachRisk ? "text-red-500" : "text-muted-foreground/50")}>
              breach {forecast.breachProbability}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ForecastPanel({ forecasts }: { forecasts: Forecast[] }) {
  const anyBreach = forecasts.some((f) => f.breachProbability > 50)

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="size-4 text-cyan-500" />
          Projected Trends
          {anyBreach && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] text-red-500">
              <AlertTriangle className="size-2.5" />
              breach risk
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {forecasts.map((f) => (
          <ForecastRow key={f.metric} forecast={f} />
        ))}
      </CardContent>
    </Card>
  )
}
