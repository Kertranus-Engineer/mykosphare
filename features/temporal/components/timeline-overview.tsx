"use client"

import { useMemo } from "react"
import { History, Wifi, WifiOff, Siren } from "lucide-react"
import { useTemporalIntelligence } from "@/lib/temporal/use-temporal"
import { useIncidents } from "@/lib/incidents/use-incidents"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { TrendCard } from "./trend-card"
import { DriftAnalysisCard } from "./drift-analysis"
import { ForecastPanel } from "./forecast-panel"
import { ReliabilityTimelineCard } from "./reliability-timeline"
import { EnvironmentalHistoryCard } from "./environmental-history"
import { TemporalSummaryCard } from "./temporal-summary"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRealtimeTelemetry } from "@/lib/realtime/subscriptions"

export function TimelineOverview() {
  const summary = useTemporalIntelligence()
  const { data: rtData } = useRealtimeTelemetry(200)
  const incidents = useIncidents()
  const connected = summary.connected

  const chartData = useMemo(() => {
    const sliced = rtData.slice(0, 60).reverse()
    return sliced.map((r) => ({
      time: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : "--",
      temperature: r.temperature ?? 24.5,
      humidity: r.humidity ?? 61,
      co2: r.co2 ?? 420,
    }))
  }, [rtData])

  const tempValues = useMemo(
    () => rtData.map((r) => r.temperature).filter((t): t is number => t !== null),
    [rtData]
  )
  const humValues = useMemo(
    () => rtData.map((r) => r.humidity).filter((h): h is number => h !== null),
    [rtData]
  )
  const co2Values = useMemo(
    () => rtData.map((r) => r.co2).filter((c): c is number => c !== null),
    [rtData]
  )
  const energyValues = useMemo(
    () => rtData.map((r) => r.energy_usage).filter((e): e is number => e !== null),
    [rtData]
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Temporal Intelligence
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Historical analysis and temporal behavior patterns
          </p>
        </div>
        {incidents.summary.totalIncidents > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1">
            <Siren className="size-3 text-violet-500" />
            <span className="text-[10px] font-medium text-violet-500">{incidents.summary.openIncidents} open</span>
            <span className="text-[10px] text-violet-500/50">·</span>
            <span className="text-[10px] text-muted-foreground/50">{incidents.summary.totalIncidents} total</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
          {connected ? (
            <Wifi className="size-3 text-emerald-500/60" />
          ) : (
            <WifiOff className="size-3 text-muted-foreground/40" />
          )}
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
            {connected ? "TEMPORAL LIVE" : "LOCAL"}
          </span>
        </div>
      </div>

      <ScenarioBanner />

      <div className="grid grid-cols-4 gap-3">
        {summary.trends.map((t) => {
          let sparkVals: number[] = []
          if (t.metric === "temperature") sparkVals = tempValues.slice(-20)
          else if (t.metric === "humidity") sparkVals = humValues.slice(-20)
          else if (t.metric === "co2") sparkVals = co2Values.slice(-20)
          else if (t.metric === "energy") sparkVals = energyValues.slice(-20)
          return <TrendCard key={t.metric} trend={t} sparklineValues={sparkVals} />
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="size-4 text-emerald-500" />
                Telemetry Timeline
                {connected && <span className="ml-auto text-[10px] text-emerald-500/60">realtime</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
                    <Area type="monotone" dataKey="temperature" stroke="#22c55e" fill="url(#tg1)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="humidity" stroke="#3b82f6" fill="url(#tg2)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <EnvironmentalHistoryCard snapshots={summary.comparativeWindows} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <ForecastPanel forecasts={summary.forecasts} />
        </div>
        <div className="lg:col-span-1">
          <DriftAnalysisCard drifts={summary.drifts} />
        </div>
        <div className="lg:col-span-1">
          <ReliabilityTimelineCard behavior={summary.behavior} />
        </div>
        <div className="lg:col-span-1">
          <TemporalSummaryCard summary={summary} connected={connected} />
        </div>
      </div>
    </div>
  )
}
