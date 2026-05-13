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
} from "lucide-react"

import { useTelemetry } from "@/mock/simulator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const trendData = [
  { day: "Mon", temp: 24.2, co2: 410 },
  { day: "Tue", temp: 24.5, co2: 415 },
  { day: "Wed", temp: 24.8, co2: 408 },
  { day: "Thu", temp: 24.6, co2: 412 },
  { day: "Fri", temp: 24.3, co2: 418 },
  { day: "Sat", temp: 24.7, co2: 405 },
  { day: "Sun", temp: 24.4, co2: 411 },
]

const efficiencyData = [
  { metric: "Mon", energy: 1.8, yield: 72 },
  { metric: "Tue", energy: 1.7, yield: 74 },
  { metric: "Wed", energy: 1.9, yield: 71 },
  { metric: "Thu", energy: 1.6, yield: 76 },
  { metric: "Fri", energy: 1.8, yield: 73 },
  { metric: "Sat", energy: 1.5, yield: 78 },
  { metric: "Sun", energy: 1.7, yield: 75 },
]

export default function AnalyticsPage() {
  const tel = useTelemetry()

  const kpis = [
    {
      icon: Activity,
      label: "Avg Temperature",
      value: `${tel.temperature.value}°C`,
      sub: "24h rolling",
    },
    {
      icon: Zap,
      label: "Energy Efficiency",
      value: `${tel.energyUsage.value} kWh`,
      sub: "0.3% vs baseline",
    },
    {
      icon: TrendingUp,
      label: "Yield Projection",
      value: "+12.4%",
      sub: "QoQ estimate",
    },
    {
      icon: Brain,
      label: "System Accuracy",
      value: "97.8%",
      sub: "Sensor confidence",
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground/70">
          Operational intelligence and environmental performance metrics
        </p>
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
              Temperature & CO₂ Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
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
                    dataKey="day"
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
                    dataKey="temp"
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
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="metric"
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
              { label: "Uptime", value: "14d 7h 32m" },
              { label: "Data Points Collected", value: "847,291" },
              { label: "Avg Response Time", value: "1.2s" },
              { label: "Sensor Reliability", value: "99.97%" },
              { label: "Calibration Due", value: "18 days" },
              { label: "Environmental Events", value: "23" },
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
