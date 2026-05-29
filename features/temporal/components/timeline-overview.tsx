"use client"

import { useMemo, useState } from "react"
import { History, Wifi, WifiOff, Siren, Thermometer, Droplets, Wind, Zap } from "lucide-react"
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
import { cn } from "@/lib/utils"

const formatDelta = (value: number, decimals = 1) =>
  `${value > 0 ? "+" : ""}${value.toFixed(decimals)}`

function generateSimulatedRealtime(count: number) {
  const data: { temperature: number; humidity: number; co2: number; energy_usage: number; created_at: string }[] = []
  const now = Date.now()
  let temp = 24.5, hum = 61, co2 = 418
  for (let i = 0; i < count; i++) {
    temp += (Math.random() - 0.5) * 0.2
    hum += (Math.random() - 0.5) * 0.3
    co2 += (Math.random() - 0.5) * 3
    temp = Math.round(Math.max(23.5, Math.min(25.5, temp)) * 10) / 10
    hum = Math.round(Math.max(58, Math.min(64, hum)) * 10) / 10
    co2 = Math.round(Math.max(405, Math.min(430, co2)))
    data.push({
      temperature: temp, humidity: hum, co2,
      energy_usage: Math.round((0.6 + Math.random() * 0.6) * 10) / 10,
      created_at: new Date(now - (count - i) * 3000).toISOString(),
    })
  }
  return data
}

function generateSimulatedSummary() {
  const now = new Date().toISOString()
  return {
    generatedAt: now,
    trends: [
      { metric: "temperature", direction: "rising" as const, slope: 0.03, volatility: 0.4, currentValue: 24.5, previousValue: 24.2, changePercent: 1.2, samples: 9 },
      { metric: "humidity", direction: "stable" as const, slope: 0.01, volatility: 0.6, currentValue: 61.2, previousValue: 60.8, changePercent: 0.7, samples: 9 },
      { metric: "co2", direction: "rising" as const, slope: 0.15, volatility: 2.1, currentValue: 418, previousValue: 410, changePercent: 2.0, samples: 9 },
      { metric: "energy", direction: "stable" as const, slope: 0.002, volatility: 0.05, currentValue: 0.8, previousValue: 0.7, changePercent: 0.1, samples: 9 },
    ],
    forecasts: [
      { metric: "temperature", currentValue: 24.5, projectedNext: 24.8, projectedChange: 1.2, projectedInstability: 8, breachProbability: 5, horizon: "6h" },
      { metric: "humidity", currentValue: 61.2, projectedNext: 60.5, projectedChange: -1.1, projectedInstability: 12, breachProbability: 15, horizon: "6h" },
      { metric: "co2", currentValue: 418, projectedNext: 425, projectedChange: 1.7, projectedInstability: 10, breachProbability: 8, horizon: "6h" },
      { metric: "energy", currentValue: 0.8, projectedNext: 0.9, projectedChange: 0.1, projectedInstability: 5, breachProbability: 2, horizon: "6h" },
    ],
    drifts: [
      { window: "1h" as const, metrics: [{ metric: "temperature", currentMean: 24.3, baselineMean: 24.1, driftMagnitude: 0.2, driftPercent: 0.8, direction: "rising" as const, significant: false }], overallDrift: 0.8, significantChanges: 0 },
      { window: "6h" as const, metrics: [{ metric: "humidity", currentMean: 61, baselineMean: 59, driftMagnitude: 2, driftPercent: 3.4, direction: "rising" as const, significant: true }], overallDrift: 3.4, significantChanges: 1 },
      { window: "24h" as const, metrics: [{ metric: "co2", currentMean: 415, baselineMean: 405, driftMagnitude: 10, driftPercent: 2.5, direction: "rising" as const, significant: true }], overallDrift: 2.5, significantChanges: 1 },
      { window: "7d" as const, metrics: [{ metric: "energy", currentMean: 0.8, baselineMean: 0.6, driftMagnitude: 0.2, driftPercent: 3.3, direction: "rising" as const, significant: false }], overallDrift: 3.3, significantChanges: 0 },
    ],
    timeline: [
      { id: "evt-01", timestamp: new Date(Date.now() - 60000).toISOString(), type: "recovery" as const, label: "System stabilized", description: "All parameters within operational range", severity: "info" as const },
      { id: "evt-02", timestamp: new Date(Date.now() - 120000).toISOString(), type: "recovery" as const, label: "Humidity returning to target", description: "Levels stabilizing at 61% RH", severity: "info" as const },
      { id: "evt-03", timestamp: new Date(Date.now() - 180000).toISOString(), type: "state_change" as const, label: "Actuator compensation active", description: "Humidifier adjusted to 60%", severity: "info" as const },
      { id: "evt-04", timestamp: new Date(Date.now() - 240000).toISOString(), type: "state_change" as const, label: "Control response initiated", description: "Automation protocol engaged for Zone B", severity: "info" as const },
      { id: "evt-05", timestamp: new Date(Date.now() - 300000).toISOString(), type: "alert" as const, label: "Humidity drift detected", description: "Zone B humidity rising above threshold", severity: "warning" as const },
      { id: "evt-06", timestamp: new Date(Date.now() - 360000).toISOString(), type: "threshold_breach" as const, label: "Temperature deviation", description: "Zone A temperature +0.6\u00b0C above setpoint", severity: "warning" as const },
      { id: "evt-07", timestamp: new Date(Date.now() - 420000).toISOString(), type: "device_event" as const, label: "Ventilation cycle completed", description: "Air exchange rate returned to nominal", severity: "info" as const },
      { id: "evt-08", timestamp: new Date(Date.now() - 480000).toISOString(), type: "state_change" as const, label: "Automation cycle complete", description: "All actuators in standby mode", severity: "info" as const },
      { id: "evt-09", timestamp: new Date(Date.now() - 540000).toISOString(), type: "alert" as const, label: "CO\u2082 levels normalized", description: "Concentration returned to 410 ppm", severity: "info" as const },
      { id: "evt-10", timestamp: new Date(Date.now() - 600000).toISOString(), type: "device_event" as const, label: "ESP32 heartbeat received", description: "Sensor mesh synchronized, 3 zones online", severity: "info" as const },
    ],
    behavior: [
      { metric: "temperature", reliabilityTrend: "stable" as const, reliabilityScore: 98.4, uptimeTrend: "stable" as const, uptimeScore: 43200, alertFreqTrend: "falling" as const, alertFreqPerHour: 0.1, packetStability: 99.2 },
      { metric: "humidity", reliabilityTrend: "stable" as const, reliabilityScore: 96.1, uptimeTrend: "stable" as const, uptimeScore: 43200, alertFreqTrend: "falling" as const, alertFreqPerHour: 0.2, packetStability: 98.5 },
      { metric: "co2", reliabilityTrend: "rising" as const, reliabilityScore: 93.7, uptimeTrend: "stable" as const, uptimeScore: 39600, alertFreqTrend: "stable" as const, alertFreqPerHour: 0.1, packetStability: 96.8 },
      { metric: "energy", reliabilityTrend: "stable" as const, reliabilityScore: 99.1, uptimeTrend: "stable" as const, uptimeScore: 64800, alertFreqTrend: "stable" as const, alertFreqPerHour: 0.0, packetStability: 99.8 },
    ],
    comparativeWindows: [
      { window: "1h" as const, avgTemperature: 24.3, avgHumidity: 60.2, avgCo2: 412, avgEnergy: 0.8, varianceTemperature: 0.15, varianceHumidity: 0.4, varianceCo2: 2.1, alertCount: 0, stabilityPct: 98.4, dataPoints: 60 },
      { window: "6h" as const, avgTemperature: 24.4, avgHumidity: 60.5, avgCo2: 414, avgEnergy: 0.8, varianceTemperature: 0.2, varianceHumidity: 0.5, varianceCo2: 2.5, alertCount: 0, stabilityPct: 96.2, dataPoints: 360 },
      { window: "24h" as const, avgTemperature: 24.5, avgHumidity: 61.0, avgCo2: 418, avgEnergy: 0.8, varianceTemperature: 0.3, varianceHumidity: 0.6, varianceCo2: 3.0, alertCount: 1, stabilityPct: 93.8, dataPoints: 1440 },
      { window: "7d" as const, avgTemperature: 24.4, avgHumidity: 60.8, avgCo2: 416, avgEnergy: 0.7, varianceTemperature: 0.4, varianceHumidity: 0.8, varianceCo2: 4.0, alertCount: 3, stabilityPct: 89.5, dataPoints: 10080 },
    ],
    worstMetric: "co2",
    bestMetric: "energy",
  }
}

const METRIC_TABS = [
  { key: "all", label: "ALL", icon: null },
  { key: "temperature", label: "TEMPERATURE", icon: Thermometer, color: "#22c55e" },
  { key: "humidity", label: "HUMIDITY", icon: Droplets, color: "#3b82f6" },
  { key: "co2", label: "CO\u2082", icon: Wind, color: "#a78bfa" },
  { key: "energy", label: "ENERGY", icon: Zap, color: "#f59e0b" },
] as const

type MetricKey = (typeof METRIC_TABS)[number]["key"]

export function TimelineOverview() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("all")
  const summary = useTemporalIntelligence()
  const { data: rtData } = useRealtimeTelemetry(200)
  const incidents = useIncidents()
  const connected = summary.connected

  const effectiveData = useMemo(() => {
    if (rtData.length > 0) return rtData
    return generateSimulatedRealtime(200)
  }, [rtData])

  const effectiveTrends = useMemo(() => {
    const hasReal = summary.trends.some((t) => t.samples > 0)
    if (hasReal) return summary.trends
    return generateSimulatedSummary().trends
  }, [summary.trends])

  const effectiveSummary = useMemo(() => {
    const hasReal = summary.trends.some((t) => t.samples > 0)
    if (hasReal) return summary
    return generateSimulatedSummary()
  }, [summary.trends])

  const chartData = useMemo(() => {
    const sliced = effectiveData.slice(0, 60).reverse()
    return sliced.map((r) => ({
      time: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        : "--",
      temperature: r.temperature ?? 24.5,
      humidity: r.humidity ?? 61,
      co2: r.co2 ?? 420,
      energy: r.energy_usage ?? 0.8,
    }))
  }, [effectiveData])

  const tempValues = useMemo(() => effectiveData.map((r) => r.temperature).filter((t): t is number => t !== null), [effectiveData])
  const humValues = useMemo(() => effectiveData.map((r) => r.humidity).filter((h): h is number => h !== null), [effectiveData])
  const co2Values = useMemo(() => effectiveData.map((r) => r.co2).filter((c): c is number => c !== null), [effectiveData])
  const energyValues = useMemo(() => effectiveData.map((r) => r.energy_usage).filter((e): e is number => e !== null), [effectiveData])

  const latestPoint = chartData[chartData.length - 1]

  const opacityFor = (metric: string) => {
    if (selectedMetric === "all") return 1
    return selectedMetric === metric ? 1 : 0.15
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Temporal Intelligence</h1>
          <p className="text-sm text-muted-foreground/70">Historical analysis and temporal behavior patterns</p>
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
          {connected ? <Wifi className="size-3 text-emerald-500/60" /> : <WifiOff className="size-3 text-muted-foreground/40" />}
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">{connected ? "TEMPORAL LIVE" : "LOCAL"}</span>
        </div>
      </div>

      <ScenarioBanner />

      <div className="grid grid-cols-4 gap-3">
        {effectiveTrends.map((t) => {
          let sparkVals: number[] = []
          if (t.metric === "temperature") sparkVals = tempValues.length > 0 ? tempValues.slice(-20) : [24.2, 24.5, 24.8, 24.6, 24.3]
          else if (t.metric === "humidity") sparkVals = humValues.length > 0 ? humValues.slice(-20) : [58, 60, 62, 61, 59]
          else if (t.metric === "co2") sparkVals = co2Values.length > 0 ? co2Values.slice(-20) : [405, 412, 418, 410, 406]
          else if (t.metric === "energy") sparkVals = energyValues.length > 0 ? energyValues.slice(-20) : [0.6, 0.8, 1.0, 0.9, 0.7]
          return <TrendCard key={t.metric} trend={t} sparklineValues={sparkVals} />
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <History className="size-4 text-emerald-500" />
                  Telemetry Timeline
                  {connected && <span className="text-[10px] text-emerald-500/60">realtime</span>}
                </CardTitle>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  {METRIC_TABS.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setSelectedMetric(tab.key)}
                      className={cn("text-[9px] font-medium px-2 py-0.5 rounded border transition-all duration-150",
                        selectedMetric === tab.key
                          ? "bg-muted/40 text-foreground" : "border-border/30 text-muted-foreground/50 hover:text-foreground/70"
                      )}
                      style={selectedMetric === tab.key && tab.key !== "all" ? { borderColor: "#22c55e" } : undefined}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40">
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{ backgroundColor: "#22c55e" }} /> Temp</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{ backgroundColor: "#3b82f6" }} /> Hum</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{ backgroundColor: "#a78bfa" }} /> CO₂</span>
                  <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} /> Energy</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative" style={{ height: "240px", width: "100%" }}>
                {/* Scanline overlay */}
                <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.04]">
                  <div className="h-px w-full bg-foreground animate-[scanline_12s_linear_infinite]" />
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                      <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                      <linearGradient id="tg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.12} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient>
                      <linearGradient id="tg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.12} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 10 }} />
                    <Area type="monotone" dataKey="temperature" stroke="#22c55e" fill="url(#tg1)" strokeWidth={2} dot={false} opacity={opacityFor("temperature")} connectNulls={false} />
                    <Area type="monotone" dataKey="humidity" stroke="#3b82f6" fill="url(#tg2)" strokeWidth={2} dot={false} opacity={opacityFor("humidity")} connectNulls={false} />
                    <Area type="monotone" dataKey="co2" stroke="#a78bfa" fill="url(#tg3)" strokeWidth={1.5} dot={false} opacity={opacityFor("co2")} connectNulls={false} />
                    <Area type="monotone" dataKey="energy" stroke="#f59e0b" fill="url(#tg4)" strokeWidth={1.5} dot={false} opacity={opacityFor("energy")} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Newest datapoint pulse */}
                {latestPoint && (
                  <div className="absolute bottom-2 right-4 z-10 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] text-muted-foreground/40">LIVE</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <EnvironmentalHistoryCard snapshots={effectiveSummary.comparativeWindows} />
        </div>
      </div>

      {/* ── Temporal Events ────────────────────── */}
      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="size-4 text-cyan-500" />
            Temporal Events
            <span className="ml-auto text-[9px] text-muted-foreground/40">{effectiveSummary.timeline.length} events</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            {effectiveSummary.timeline.slice(0, 10).map((evt, i) => (
              <div key={evt.id} className="flex items-center gap-3 rounded-md bg-muted/15 px-3 py-2 transition-colors hover:bg-muted/25">
                <span className="text-[10px] tabular-nums text-muted-foreground/40 w-10 shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div className={cn("size-1.5 rounded-full shrink-0",
                  evt.severity === "critical" ? "bg-red-500" :
                  evt.severity === "warning" ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-foreground/80">{evt.label}</span>
                  <span className="text-[10px] text-muted-foreground/50">{evt.description}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1"><ForecastPanel forecasts={effectiveSummary.forecasts} /></div>
        <div className="lg:col-span-1"><DriftAnalysisCard drifts={effectiveSummary.drifts} /></div>
        <div className="lg:col-span-1"><ReliabilityTimelineCard behavior={effectiveSummary.behavior} /></div>
        <div className="lg:col-span-1"><TemporalSummaryCard summary={effectiveSummary} connected={connected} /></div>
      </div>
    </div>
  )
}
