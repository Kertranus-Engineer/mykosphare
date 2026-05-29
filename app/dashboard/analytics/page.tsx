"use client"

import { useMemo } from "react"
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts"
import {
  Activity,
  Brain,
  TrendingUp,
  Zap,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useTelemetryHistory } from "@/lib/hooks/use-telemetry-history"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"

function TrendIcon({ trend }: { trend: "rising" | "falling" | "stable" }) {
  return (
    <span className={cn("text-[10px] font-medium", trend === "rising" ? "text-emerald-500" : trend === "falling" ? "text-red-500" : "text-muted-foreground/50")}>
      {trend === "rising" ? "\u2191" : trend === "falling" ? "\u2193" : "\u2192"}
    </span>
  )
}

function linearRegression(values: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0]?.y ?? 0 }
  const sumX = values.reduce((s, v) => s + v.x, 0)
  const sumY = values.reduce((s, v) => s + v.y, 0)
  const sumXY = values.reduce((s, v) => s + v.x * v.y, 0)
  const sumX2 = values.reduce((s, v) => s + v.x * v.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function buildPredictions(data: { time: string; value: number }[], count: number): { time: string; predicted: number | null }[] {
  if (data.length < 2) return []
  const points = data.map((d, i) => ({ x: i, y: d.value }))
  const { slope, intercept } = linearRegression(points)
  const lastIdx = data.length - 1
  return Array.from({ length: count }, (_, i) => ({
    time: `+${(i + 1) * 2}h`,
    predicted: Math.round((intercept + slope * (lastIdx + i + 1)) * 10) / 10,
  }))
}

interface TrendChartProps {
  data: { time: string; value: number }[]
  predictions: { time: string; predicted: number | null }[]
  color: string
  gradientId: string
  label: string
  unit: string
  trend: "rising" | "falling" | "stable"
}

function TrendChart({ data, predictions, color, gradientId, label, unit, trend }: TrendChartProps) {
  const combined = useMemo(() => {
    const maxLen = Math.max(data.length, data.length + predictions.length)
    const result: ({ time: string; value: number | null; predicted: number | null })[] = []
    for (let i = 0; i < data.length; i++) {
      result.push({ time: data[i].time, value: data[i].value, predicted: null })
    }
    for (let i = 0; i < predictions.length; i++) {
      result.push({ time: predictions[i].time, value: null, predicted: predictions[i].predicted })
    }
    return result
  }, [data, predictions])

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const avg = values.reduce((s, v) => s + v, 0) / values.length

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="flex size-7 items-center justify-center rounded-lg bg-muted" style={{ color }}>
            {label === "Temperature" ? <Thermometer className="size-3.5" /> : label === "Humidity" ? <Droplets className="size-3.5" /> : <Wind className="size-3.5" />}
          </div>
          <span>{label} Trend</span>
          <TrendIcon trend={trend} />
          <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground/50">
            <span>Min: <span className="font-semibold tabular-nums" style={{ color }}>{min.toFixed(1)}{unit}</span></span>
            <span>Max: <span className="font-semibold tabular-nums" style={{ color }}>{max.toFixed(1)}{unit}</span></span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-36 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combined} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[Math.floor(min - 1), Math.ceil(max + 1)]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 11 }} />
              <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 4, fill: color }} connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke={color} strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 2, fill: color, strokeOpacity: 0.5 }} connectNulls={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground/40">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-px bg-foreground/30" /> Observed</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-px border-t border-dashed border-foreground/20" /> Predicted 6h</span>
          <span className="ml-auto">Avg: <span className="font-semibold tabular-nums" style={{ color }}>{avg.toFixed(1)}{unit}</span></span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { rollingAverages, trends, stability, variance, recentHistory, rows } = useTelemetryHistory()
  const rtTel = useRealTimeTelemetry()

  const dataPoints = rows.length || Math.floor(
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("mykosphare_telemetry_count") ?? "0")
      : 0
  )

  const chartData = recentHistory.length > 0 ? recentHistory : [
    { time: "00:00", temperature: 24.2, humidity: 62, co2: 410, energy: 1.8 },
    { time: "04:00", temperature: 24.5, humidity: 61, co2: 415, energy: 1.7 },
    { time: "08:00", temperature: 24.8, humidity: 60, co2: 408, energy: 1.9 },
    { time: "12:00", temperature: 25.1, humidity: 59, co2: 412, energy: 1.6 },
    { time: "16:00", temperature: 24.9, humidity: 60, co2: 418, energy: 1.8 },
    { time: "20:00", temperature: 24.6, humidity: 61, co2: 405, energy: 1.5 },
    { time: "24:00", temperature: 24.3, humidity: 62, co2: 411, energy: 1.7 },
  ]

  const tempData = useMemo(() => chartData.map((d) => ({ time: d.time, value: d.temperature })), [chartData])
  const humData = useMemo(() => chartData.map((d) => ({ time: d.time, value: d.humidity })), [chartData])
  const co2Data = useMemo(() => chartData.map((d) => ({ time: d.time, value: d.co2 })), [chartData])

  const tempPredictions = useMemo(() => buildPredictions(tempData, 3), [tempData])
  const humPredictions = useMemo(() => buildPredictions(humData, 3), [humData])
  const co2Predictions = useMemo(() => buildPredictions(co2Data, 3), [co2Data])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground/70">Operational intelligence and environmental performance metrics</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
          {rtTel.online ? <Wifi className="size-3 text-emerald-500" /> : <WifiOff className="size-3 text-muted-foreground/40" />}
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">{rtTel.online ? "ESP32 LIVE" : "ESP32 OFFLINE"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Activity, label: "Avg Temperature", value: `${rollingAverages.temperature}°C`, sub: <span className="inline-flex items-center gap-1">24h rolling <TrendIcon trend={trends.temperature} /></span> },
          { icon: Zap, label: "Avg Humidity", value: `${rollingAverages.humidity}%`, sub: `${variance.humidity > 3 ? "Elevated" : "Nominal"} variance` },
          { icon: TrendingUp, label: "Avg CO₂", value: `${rollingAverages.co2} ppm`, sub: `CO\u2082 ${trends.co2 === "rising" ? "rising" : trends.co2 === "falling" ? "falling" : "stable"}` },
          { icon: Brain, label: "Stability", value: `${stability}%`, sub: `${dataPoints} data points` },
        ].map((kpi) => (
          <Card key={kpi.label} size="sm" className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-muted"><kpi.icon className="size-3.5 text-muted-foreground/60" /></div>
                <span className="text-xs text-muted-foreground/70">{kpi.label}</span>
              </div>
              <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{kpi.value}</span>
              <span className="text-[10px] text-muted-foreground/50">{kpi.sub}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TrendChart data={tempData} predictions={tempPredictions} color="#22c55e" gradientId="temp" label="Temperature" unit="°C" trend={trends.temperature} />
        <TrendChart data={humData} predictions={humPredictions} color="#3b82f6" gradientId="hum" label="Humidity" unit="%" trend={trends.humidity} />
        <TrendChart data={co2Data} predictions={co2Predictions} color="#a78bfa" gradientId="co2" label="CO₂" unit=" ppm" trend={trends.co2} />
      </div>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Operational Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              { label: "Data Points", value: `${dataPoints}` },
              { label: "Stability", value: `${stability}%` },
              { label: "Temp Variance", value: `\u00b1${variance.temperature}°C` },
              { label: "Humidity Variance", value: `\u00b1${variance.humidity}%` },
              { label: "CO\u2082 Variance", value: `\u00b1${variance.co2} ppm` },
              { label: "Avg Energy", value: `${rollingAverages.energy} kWh` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2.5">
                <span className="text-xs text-muted-foreground/70">{item.label}</span>
                <span className="text-sm font-medium tabular-nums tracking-tight text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
