"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Clock, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ComparativeSnapshot } from "@/lib/temporal/types"
import { WINDOW_LABELS, type ComparativeWindow } from "@/lib/temporal/types"
import { cn } from "@/lib/utils"

const BAR_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"]
const WINDOW_ORDER: ComparativeWindow[] = ["1h", "6h", "24h", "7d"]

export function EnvironmentalHistoryCard({ snapshots }: { snapshots: ComparativeSnapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-emerald-500" />
            Environmental History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-[11px] text-muted-foreground/60">Collecting data...</span>
        </CardContent>
      </Card>
    )
  }

  const chartData = WINDOW_ORDER.map((w) => {
    const snap = snapshots.find((s) => s.window === w)
    return {
      window: WINDOW_LABELS[w].replace("Last ", "").replace(" Hours", "h").replace(" Hour", "h").replace(" Days", "d"),
      temperature: snap?.avgTemperature ?? 0,
      humidity: snap?.avgHumidity ?? 0,
      co2: snap ? Math.round(snap.avgCo2 / 10) * 10 : 0,
      stability: snap?.stabilityPct ?? 100,
      alerts: snap?.alertCount ?? 0,
    }
  })

  const metrics = snapshots[0] && (
    <div className="grid grid-cols-4 gap-2">
      {(["avgTemperature", "avgHumidity", "avgCo2", "stabilityPct"] as const).map((key, i) => {
        const labels: Record<string, string> = { avgTemperature: "Temperature", avgHumidity: "Humidity", avgCo2: "CO₂", stabilityPct: "Operational Stability" }
        const units: Record<string, string> = { avgTemperature: "°C", avgHumidity: "%", avgCo2: " ppm", stabilityPct: "%" }
        const vals = snapshots.map((s) => s[key])
        const first = vals[0]
        const last = vals[vals.length - 1]
        const diff = first !== undefined && last !== undefined ? last - first : 0
        return (
          <div key={key} className="rounded-lg bg-muted/20 p-2 text-center">
            <span className="text-[9px] text-muted-foreground/60 block">{labels[key]}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground block">{first !== undefined ? (key === "stabilityPct" ? first.toFixed(1) : first) : "--"}{units[key]}</span>
            <span className={cn("text-[9px] tabular-nums", diff > 0 ? "text-amber-500" : diff < 0 ? "text-emerald-500" : "text-muted-foreground/40")}>
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}{units[key]}
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-emerald-500" />
          Environmental History
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {metrics}
        <div className="h-36 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="window" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", fontSize: 12 }} />
              <Bar dataKey="temperature" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.7} />
              <Bar dataKey="humidity" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
