"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  BarChart3,
  Brain,
  TrendingUp,
  Zap,
  Wifi,
  WifiOff,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useTelemetryHistory } from "@/lib/hooks/use-telemetry-history"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"

function TrendIcon({ trend }: { trend: "rising" | "falling" | "stable" }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium",
        trend === "rising"
          ? "text-emerald-500"
          : trend === "falling"
            ? "text-red-500"
            : "text-muted-foreground/50"
      )}
    >
      {trend === "rising" ? "\u2191" : trend === "falling" ? "\u2193" : "\u2192"}
    </span>
  )
}

export default function AnalyticsPage() {
  const { rollingAverages, trends, stability, variance, recentHistory, rows } =
    useTelemetryHistory()
  const rtTel = useRealTimeTelemetry()

  const dataPoints = rows.length || Math.floor(
    (typeof window !== "undefined"
      ? parseInt(localStorage.getItem("mykosphare_telemetry_count") ?? "0")
      : 0)
  )

  const kpis = [
    {
      icon: Activity,
      label: "Avg Temperature",
      value: `${rollingAverages.temperature}°C`,
      sub: (
        <span className="inline-flex items-center gap-1">
          24h rolling <TrendIcon trend={trends.temperature} />
        </span>
      ),
    },
    {
      icon: Zap,
      label: "Energy Usage",
      value: `${rollingAverages.energy} kWh`,
      sub: `${variance.temperature > 0.5 ? "Elevated" : "Nominal"} variance`,
    },
    {
      icon: TrendingUp,
      label: "Operational Stability",
      value: `${stability}%`,
      sub: `CO\u2082 ${trends.co2 === "rising" ? "rising" : trends.co2 === "falling" ? "falling" : "stable"}`,
    },
    {
      icon: Brain,
      label: "System Variance",
      value: `\u00b1${variance.temperature}°C`,
      sub: `${rows.length} data points`,
    },
  ]

  const chartData = recentHistory.length > 0
    ? recentHistory
    : [
        { time: "00:00", temperature: 24.2, humidity: 62, co2: 410, energy: 1.8 },
        { time: "04:00", temperature: 24.5, humidity: 61, co2: 415, energy: 1.7 },
        { time: "08:00", temperature: 24.8, humidity: 60, co2: 408, energy: 1.9 },
        { time: "12:00", temperature: 25.1, humidity: 59, co2: 412, energy: 1.6 },
        { time: "16:00", temperature: 24.9, humidity: 60, co2: 418, energy: 1.8 },
        { time: "20:00", temperature: 24.6, humidity: 61, co2: 405, energy: 1.5 },
        { time: "24:00", temperature: 24.3, humidity: 62, co2: 411, energy: 1.7 },
      ]

  const energyData = chartData.map((d) => ({
    time: d.time,
    energy: d.energy,
  }))

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Operational intelligence and environmental performance metrics
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
          {rtTel.online ? (
            <Wifi className="size-3 text-emerald-500" />
          ) : (
            <WifiOff className="size-3 text-muted-foreground/40" />
          )}
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
            {rtTel.online ? "ESP32 LIVE" : "ESP32 OFFLINE"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            size="sm"
            className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10"
          >
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-muted">
                  <kpi.icon className="size-3.5 text-muted-foreground/60" />
                </div>
                <span className="text-xs text-muted-foreground/70">
                  {kpi.label}
                </span>
              </div>
              <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {kpi.value}
              </span>
              <span className="text-[10px] text-muted-foreground/50">{kpi.sub}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="col-span-2 transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4 text-muted-foreground" />
              Temperature & CO\u2082 Trends
              {rtTel.online && (
                <span className="ml-auto text-[10px] text-emerald-500/60">realtime</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="at1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="at2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#22c55e"
                    fill="url(#at1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="co2"
                    stroke="#3b82f6"
                    fill="url(#at2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="size-4 text-muted-foreground" />
              Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="energy"
                    fill="hsl(var(--muted-foreground))"
                    radius={[3, 3, 0, 0]}
                    opacity={0.6}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="text-sm">Operational Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              { label: "Data Points", value: `${dataPoints}` },
              { label: "Stability", value: `${stability}%` },
              { label: "Temp Variance", value: `\u00b1${variance.temperature}°C` },
              { label: "Humidity Variance", value: `\u00b1${variance.humidity}%` },
              { label: "CO\u2082 Variance", value: `\u00b1${variance.co2} ppm` },
              { label: "Avg Energy", value: `${rollingAverages.energy} kWh` },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2.5"
              >
                <span className="text-xs text-muted-foreground/70">
                  {item.label}
                </span>
                <span className="text-sm font-medium tabular-nums tracking-tight text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
