"use client"

import { ScrollText, TrendingUp, TrendingDown, Minus, Wifi, WifiOff, Siren } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { OperationalSummary } from "@/lib/intelligence/types"
import type { IncidentSummary } from "@/lib/incidents/types"
import { CARD_HOVER, OPERATIONAL_STATUS, scoreToMeta } from "@/lib/styles/tokens"

function TrendIcon({ score }: { score: number }) {
  if (score >= 80) return <TrendingUp className="size-3 text-emerald-500" />
  if (score >= 50) return <Minus className="size-3 text-amber-500" />
  return <TrendingDown className="size-3 text-red-500" />
}

export function OperationalSummaryCard({ summary, incidentSummary }: { summary: OperationalSummary; incidentSummary?: IncidentSummary }) {
  const meta = OPERATIONAL_STATUS[summary.overall.status] ?? OPERATIONAL_STATUS.critical

  return (
    <Card className={cn(CARD_HOVER, meta.border)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ScrollText className={cn("size-4", meta.color)} />
          Operational Summary
          {incidentSummary && incidentSummary.totalIncidents > 0 ? (
            <div className="ml-auto flex items-center gap-1 rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5">
              <Siren className="size-2.5 text-violet-500" />
              <span className="text-[8px] font-semibold text-violet-500">{incidentSummary.openIncidents} incident{incidentSummary.openIncidents !== 1 ? "s" : ""}</span>
            </div>
          ) : summary.connected ? (
            <Wifi className="size-3 text-emerald-500/60 ml-auto" />
          ) : (
            <WifiOff className="size-3 text-muted-foreground/40 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-14 items-center justify-center rounded-xl border", meta.bg, meta.border)}>
            <span className={cn("text-xl font-bold tabular-nums", meta.color)}>{summary.overall.score}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-sm font-medium capitalize", meta.color)}>{summary.overall.status}</span>
            <span className="text-[10px] text-muted-foreground/50">
              {summary.health.label}: {summary.health.score} · {summary.stability.label}: {summary.stability.score} · {summary.reliability.label}: {summary.reliability.score}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Health", score: summary.health.score },
            { label: "Stability", score: summary.stability.score },
            { label: "Reliability", score: summary.reliability.score },
          ].map((item) => {
            const m = scoreToMeta(item.score)
            return (
              <div key={item.label} className={cn("rounded-lg border p-2 text-center", m.bg, m.border)}>
                <div className="flex items-center justify-center gap-1">
                  <TrendIcon score={item.score} />
                  <span className={cn("text-sm font-bold tabular-nums", m.color)}>{item.score}</span>
                </div>
                <span className="block text-[9px] text-muted-foreground/50 mt-0.5">{item.label}</span>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg bg-muted/20 p-2.5">
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground/60">Temp Avg</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground">{summary.rollingAvg.temperature}°C</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground/60">Humidity Avg</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground">{summary.rollingAvg.humidity}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground/60">CO₂ Avg</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground">{summary.rollingAvg.co2} ppm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-muted-foreground/60">Energy Avg</span>
            <span className="text-[10px] font-medium tabular-nums text-foreground">{summary.rollingAvg.energy} kWh</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/20 px-2.5 py-1.5">
          <span className="text-[9px] text-muted-foreground/40">Generated {new Date(summary.generatedAt).toLocaleTimeString()}</span>
          <div className="flex items-center gap-1">
            <div className={cn("size-1.5 rounded-full", summary.connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
            <span className="text-[9px] text-muted-foreground/40">{summary.connected ? "REALTIME" : "CACHED"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
