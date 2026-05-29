"use client"

import { useSyncExternalStore } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { useRealEnvironment } from "@/lib/useEnvironment"
import { useTelemetryHistory } from "@/lib/useTelemetry"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChartGuard } from "./safe-chart"

type ChartTheme = {
  tempStroke: string
  humStroke: string
  tempFill: string
  humFill: string
  opacity: number
  label: string
}

const THEMES: Record<string, ChartTheme> = {
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
  CRITICAL: {
    tempStroke: "#ef4444",
    humStroke: "#ef4444",
    tempFill: "#ef4444",
    humFill: "#ef4444",
    opacity: 0.15,
    label: "Critical",
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
  const env = useRealEnvironment()
  const history = useTelemetryHistory()
  const theme = THEMES[env.state] ?? THEMES.STABLE
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const data = history.length > 0
    ? [...history].reverse()
    : [
        { time: "--:--", temperature: 0, humidity: 0 },
        { time: "--:--", temperature: 0, humidity: 0 },
      ]

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
            {theme.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full min-w-0">
          {mounted && (
            <ChartGuard>
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
            </ChartGuard>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
