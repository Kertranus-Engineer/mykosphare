"use client"

import { useMemo, useState, useEffect } from "react"
import { Thermometer, Droplets, Wind, Wifi, WifiOff, Clock, FlaskConical } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDashboardTelemetry, useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useRealEnvironment } from "@/lib/useEnvironment"
import { useOperationalMemory } from "@/lib/operational/memory"
import { ActuatorBar } from "./actuator-bar"
import { AiAnalysisPanel } from "./ai-analysis-panel"
import { AlertPanel } from "./alert-panel"
import { ChamberPanel } from "./chamber-panel"
import { LcdStatus } from "./lcd-status"
import { MetricCard } from "./metric-card"
import { SystemLogs } from "./system-logs"
import { TelemetryChart } from "./telemetry-chart"
import { QuickStart } from "@/features/quick-start/components/quick-start"
import { TelemetryDebugPanel } from "./telemetry-debug"
import { OperationalNarrative } from "./operational-narrative"
import { EnergyCard } from "./energy-card"
import { AutoDemo } from "./auto-demo"
import { MissionStatus } from "./mission-status"
export function DashboardGrid() {
  const tel = useDashboardTelemetry()
  const rtTel = useRealTimeTelemetry()
  const env = useRealEnvironment()
  const mem = useOperationalMemory()
  const [initDone, setInitDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setInitDone(true), 50)
    return () => clearTimeout(t)
  }, [])

  const tempVal = tel.temperature.value
  const humVal = tel.humidity.value
  const co2Val = tel.co2.value
  const hasData = tel.hasRealData
  const booting = !hasData && rtTel.online && !rtTel.stale

  const tempCritical = useMemo(() => tempVal > 32, [tempVal])
  const tempWarning = useMemo(() => tempVal > 28 && !tempCritical, [tempVal, tempCritical])
  const humCritical = useMemo(() => humVal < 40 && humVal > 0, [humVal])
  const humWarning = useMemo(() => (humVal < 50 || humVal > 75) && !humCritical && humVal > 0, [humVal, humCritical])

  const statusText = booting
    ? "WAITING FOR TELEMETRY"
    : rtTel.stale && rtTel.source === "live"
      ? "TELEMETRY STALE"
      : rtTel.source === "simulated"
        ? "SIMULATION ACTIVE"
        : rtTel.degraded
          ? "TELEMETRY DEGRADED"
          : rtTel.online
            ? "ESP32 ONLINE"
            : "DEVICE OFFLINE"

  const statusColor = booting
    ? "bg-blue-500 animate-pulse"
    : rtTel.source === "simulated"
      ? "bg-amber-500 animate-pulse"
      : rtTel.degraded
        ? "bg-amber-500 animate-pulse"
        : rtTel.online
          ? "bg-emerald-500 animate-pulse"
          : "bg-muted-foreground/30"

  return (
    <div className={`flex flex-col gap-5 p-2 ${initDone ? "dashboard-init" : "dashboard-init-hidden"}`}>
      <QuickStart />
      <TelemetryDebugPanel />

      <div className="flex items-center justify-between">
        <AutoDemo />
        <div className="flex items-center gap-2">
          {rtTel.source === "simulated" && (
            <div className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
              <FlaskConical className="size-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-500 tracking-wide">SIMULATION</span>
            </div>
          )}
          {rtTel.stale && (
            <div className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-1">
              <Clock className="size-3 text-amber-500/60" />
              <span className="text-[10px] font-medium text-amber-500/60 tracking-wide">STALE DATA</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            <div
              className={cn(
                "size-1.5 rounded-full transition-all duration-500",
                statusColor
              )}
            />
            {rtTel.online ? (
              <Wifi className={cn("size-3", booting ? "text-blue-500/60" : "text-emerald-500/60")} />
            ) : (
              <WifiOff className="size-3 text-muted-foreground/30" />
            )}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">
              {statusText}
            </span>
          </div>
        </div>
      </div>
      <MissionStatus />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          icon={Thermometer}
          label="Temperature"
          value={tempVal}
          unit="°C"
          decimals={1}
          trend={tel.temperature.trend}
          delta={tel.temperature.delta}
          critical={tempCritical}
          warning={tempWarning}
        />
        <MetricCard
          icon={Droplets}
          label="Humidity"
          value={humVal}
          unit="%"
          decimals={1}
          trend={tel.humidity.trend}
          delta={tel.humidity.delta}
          critical={humCritical}
          warning={humWarning}
        />
        <MetricCard
          icon={Wind}
          label="CO₂"
          value={co2Val}
          unit=" ppm"
          decimals={0}
          trend={tel.co2.trend}
          delta={tel.co2.delta}
        />
        <EnergyCard tel={tel} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="flex-1 xl:flex-[3] rounded-lg section-tint-chamber">
          <ChamberPanel />
        </div>
        <div className="flex flex-col gap-4 xl:flex-[1.4]">
          <div className="rounded-lg section-tint-intelligence">
            <AiAnalysisPanel />
          </div>
          <LcdStatus />
          <ActuatorBar />
          <AlertPanel />
        </div>
      </div>

      <OperationalNarrative />

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="flex-1 xl:flex-[2]">
          <TelemetryChart />
        </div>
        <div className="flex-1">
          <SystemLogs />
        </div>
      </div>

      <div className="flex items-center gap-3 text-[9px] text-muted-foreground/20 font-mono tracking-wider overflow-hidden">
        <span className={cn(
          mem.facilityPersonality === "damaged" ? "text-red-500/30" :
          mem.facilityPersonality === "tired" ? "text-amber-500/30" :
          "text-emerald-500/30"
        )}>[SYS]</span>
        <span>{mem.facilityPersonality === "damaged" ? "DAMAGED" : mem.facilityPersonality === "tired" ? "TIRED" : "HEALTHY"}</span>
        <span className="text-muted-foreground/10">·</span>
        <span className="text-blue-500/30">[LOAD]</span>
        <span>STRESS {mem.stressIndex}% · FATIGUE {mem.fatigue}%</span>
        <span className="text-muted-foreground/10">·</span>
        <span className="text-violet-500/30">[AI]</span>
        <span>{env.state === "CRITICAL" ? "escalation risk elevated" : env.state === "WARNING" ? "deviation probability monitoring" : env.state === "RECOVERY" ? "equilibrium restoration in progress" : "environmental confidence holding"}</span>
        <span className="text-muted-foreground/10">·</span>
        <span className="text-muted-foreground/20">OPR L2 · {initDone ? mem.systemAge : "--"} · {mem.facilityReputation.label}</span>
      </div>
    </div>
  )
}
