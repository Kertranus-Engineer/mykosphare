"use client"

import { Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOperationalIntelligence } from "@/lib/intelligence/use-intelligence"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { useIncidents } from "@/lib/incidents/use-incidents"
import { ScenarioBanner } from "@/features/scenario/components/scenario-banner"
import { IncidentSummaryBadge } from "@/features/incidents/components/incident-badge"
import { HealthScoreCard } from "./health-score-card"
import { StabilityCard } from "./stability-card"
import { ReliabilityPanel } from "./reliability-panel"
import { AlertHeatmap } from "./alert-heatmap"
import { OperationalSummaryCard } from "./operational-summary"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRealtimeTelemetry } from "@/lib/realtime/subscriptions"
import { useMemo } from "react"
import { useTelemetry } from "@/mock/simulator"

export function IntelligenceOverview() {
  const summary = useOperationalIntelligence()
  const { data: rtData } = useRealtimeTelemetry(200)
  const liveTelemetry = useTelemetry()

  const telemetryScores = useMemo(() => {
    const temps = rtData.map((r) => r.temperature).filter((t): t is number => t !== null)
    const hums = rtData.map((r) => r.humidity).filter((h): h is number => h !== null)
    if (temps.length === 0) {
      temps.push(liveTelemetry.temperature.value)
      hums.push(liveTelemetry.humidity.value)
    }
    const score = (v: number, target: number, margin: number): number => {
      const diff = Math.abs(v - target)
      if (diff <= margin * 0.3) return 100
      if (diff <= margin) return 75
      if (diff <= margin * 2) return 45
      return 15
    }
    const tempScore = Math.round(temps.reduce((s, t) => s + score(t, 24.5, 1.5), 0) / temps.length)
    const humScore = Math.round(hums.reduce((s, h) => s + score(h, 61, 5), 0) / hums.length)
    const bucketSize = Math.max(1, Math.floor(temps.length / 12))
    const chartData = Array.from({ length: Math.min(12, Math.ceil(temps.length / bucketSize)) }, (_, i) => {
      const slice = temps.slice(i * bucketSize, (i + 1) * bucketSize)
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length
      return {
        label: `${i * bucketSize}`,
        temperature: Math.round(avg * 10) / 10,
        humidity: Math.round(hums.slice(i * bucketSize, (i + 1) * bucketSize).reduce((a, b) => a + b, 0) / Math.max(1, hums.slice(i * bucketSize, (i + 1) * bucketSize).length) * 10) / 10,
      }
    })
    return { chartData, tempScore, humScore }
  }, [rtData, liveTelemetry])

  const unified = useUnifiedOperationalState()
  const incidents = useIncidents()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Operational Intelligence
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Executive-level environmental insights and derived metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unified.incidentSummary.totalIncidents > 0 && (
            <IncidentSummaryBadge
              openCount={unified.incidentSummary.openIncidents}
              criticalCount={unified.incidentSummary.criticalIncidents}
              totalCount={unified.incidentSummary.totalIncidents}
            />
          )}
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            <div className={cn("size-1.5 rounded-full transition-all duration-500", summary.connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
            <Brain className={cn("size-3 transition-all", summary.connected ? "text-emerald-500/60" : "text-muted-foreground/30")} />
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {summary.connected ? "INTELLIGENCE LIVE" : "CACHED"}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1">
            <span className="text-[10px] font-medium text-muted-foreground/60">
              Cohesion: {unified.crossLayer.overallCohesion}%
            </span>
          </div>
        </div>
      </div>

      <ScenarioBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <HealthScoreCard score={summary.health} />
        </div>
        <div className="lg:col-span-1">
          <StabilityCard stability={summary.stability} />
        </div>
        <div className="lg:col-span-1">
          <ReliabilityPanel reliability={summary.reliability} />
        </div>
        <div className="lg:col-span-1">
          <AlertHeatmap density={summary.alertDensity} durations={summary.alertDurations} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="size-4 text-violet-500" />
                Metric Conformance (24h Rolling)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={telemetryScores.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} tickLine={false} />
                    <YAxis domain={[15, 26]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
                    <Bar dataKey="temperature" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.7} />
                    <Bar dataKey="humidity" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <OperationalSummaryCard summary={summary} incidentSummary={incidents.summary} />
        </div>
      </div>
    </div>
  )
}
