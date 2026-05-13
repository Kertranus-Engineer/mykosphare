"use client"

import { Thermometer, Droplets, Wind, Zap, Wifi } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTelemetry } from "@/mock/simulator"
import { AiAnalysisPanel } from "./ai-analysis-panel"
import { AlertPanel } from "./alert-panel"
import { ChamberPanel } from "./chamber-panel"
import { MetricCard } from "./metric-card"
import { SystemLogs } from "./system-logs"
import { TelemetryChart } from "./telemetry-chart"
import { useRealtimeTelemetry } from "@/lib/realtime/subscriptions"

export function DashboardGrid() {
  const t = useTelemetry()
  const { status: rtStatus, latency } = useRealtimeTelemetry(1)

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
          <div
            className={cn(
              "size-1.5 rounded-full transition-all duration-500",
              rtStatus === "live" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
            )}
          />
          <Wifi
            className={cn(
              "size-3 transition-all duration-500",
              rtStatus === "live" ? "text-emerald-500/60" : "text-muted-foreground/30"
            )}
          />
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
            {rtStatus === "live"
              ? `TELEMETRY LIVE${latency !== null ? ` ${latency}ms` : ""}`
              : rtStatus === "connecting"
                ? "CONNECTING"
                : "LOCAL SIMULATION"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Thermometer}
          label="Temperature"
          value={`${t.temperature.value}°C`}
          trend={t.temperature.trend}
          trendLabel={`${t.temperature.delta >= 0 ? "+" : ""}${t.temperature.delta.toFixed(1)}°`}
        />
        <MetricCard
          icon={Droplets}
          label="Humidity"
          value={`${t.humidity.value}%`}
          trend={t.humidity.trend}
          trendLabel={`${t.humidity.delta >= 0 ? "+" : ""}${t.humidity.delta.toFixed(1)}%`}
        />
        <MetricCard
          icon={Wind}
          label="CO₂"
          value={`${t.co2.value} ppm`}
          trend={t.co2.trend}
          trendLabel={`${t.co2.delta >= 0 ? "+" : ""}${t.co2.delta} ppm`}
        />
        <MetricCard
          icon={Zap}
          label="Energy Usage"
          value={`${t.energyUsage.value} kWh`}
          trend={t.energyUsage.trend}
          trendLabel={`${t.energyUsage.delta >= 0 ? "+" : ""}${t.energyUsage.delta.toFixed(1)}`}
        />
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 xl:flex-[3]">
          <ChamberPanel />
        </div>
        <div className="flex flex-col gap-4 xl:flex-[1.4]">
          <AiAnalysisPanel />
          <AlertPanel />
        </div>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 xl:flex-[2]">
          <TelemetryChart />
        </div>
        <div className="flex-1">
          <SystemLogs />
        </div>
      </div>
    </div>
  )
}
