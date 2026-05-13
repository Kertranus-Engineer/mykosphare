"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useEnvironment } from "@/mock/environment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"

const data = [
  { time: "00:00", temperature: 24.2, humidity: 62 },
  { time: "04:00", temperature: 24.5, humidity: 61 },
  { time: "08:00", temperature: 24.8, humidity: 60 },
  { time: "12:00", temperature: 25.1, humidity: 59 },
  { time: "16:00", temperature: 24.9, humidity: 60 },
  { time: "20:00", temperature: 24.6, humidity: 61 },
  { time: "24:00", temperature: 24.3, humidity: 62 },
]

const THEMES = {
  STABLE: {
    tempStroke: "#22c55e",
    humStroke: "#3b82f6",
    tempFill: "#22c55e",
    humFill: "#3b82f6",
    opacity: 0.15,
    label: "Normal",
  },
  OPTIMIZING: {
    tempStroke: "#3b82f6",
    humStroke: "#60a5fa",
    tempFill: "#3b82f6",
    humFill: "#60a5fa",
    opacity: 0.12,
    label: "Adjusting",
  },
  WARNING: {
    tempStroke: "#f59e0b",
    humStroke: "#f59e0b",
    tempFill: "#f59e0b",
    humFill: "#f59e0b",
    opacity: 0.1,
    label: "Monitoring",
  },
  RECOVERY: {
    tempStroke: "#14b8a6",
    humStroke: "#14b8a6",
    tempFill: "#14b8a6",
    humFill: "#14b8a6",
    opacity: 0.12,
    label: "Stabilizing",
  },
}

export function TelemetryChart() {
  const env = useEnvironment()
  const theme = useMemo(() => THEMES[env.state], [env.state])

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          Telemetry Trends
          <span
            className={cn(
              "ml-auto text-[10px] font-medium tracking-wider transition-all duration-300",
              env.color
            )}
          >
            {THEMES[env.state].label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={theme.tempFill}
                    stopOpacity={theme.opacity}
                  />
                  <stop
                    offset="100%"
                    stopColor={theme.tempFill}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="humidGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={theme.humFill}
                    stopOpacity={theme.opacity * 0.8}
                  />
                  <stop
                    offset="100%"
                    stopColor={theme.humFill}
                    stopOpacity={0}
                  />
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
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke={theme.tempStroke}
                fill="url(#tempGrad)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="humidity"
                stroke={theme.humStroke}
                fill="url(#humidGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
