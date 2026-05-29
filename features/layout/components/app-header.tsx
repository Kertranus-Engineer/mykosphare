"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, Circle, RefreshCw, Activity, Thermometer, Droplets, Wind, Sparkles, Radio, FlaskConical } from "lucide-react"

import { useRealEnvironment } from "@/lib/useEnvironment"
import { useRealTimeTelemetry, useDashboardTelemetry } from "@/lib/useTelemetry"
import { cn } from "@/lib/utils"
import { OperatorDropdown } from "./operator-dropdown"
import { PresentationToggle } from "@/features/presentation/components/presentation-toggle"
import { SystemSnapshot } from "@/features/snapshot/components/system-snapshot"
import { ThemeSelector } from "./theme-selector"

const BADGE_STYLES: Record<string, string> = {
  STABLE: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
  OPTIMIZING: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
  PRE_WARNING: "bg-yellow-500/10 text-yellow-500 ring-yellow-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  ESCALATION: "bg-orange-500/10 text-orange-500 ring-orange-500/20",
  CRITICAL: "bg-red-500/10 text-red-500 ring-red-500/20",
  RECOVERY: "bg-teal-500/10 text-teal-500 ring-teal-500/20",
}

const BADGE_GLOW: Record<string, string> = {
  STABLE: "shadow-[0_0_6px_1px] shadow-emerald-500/20",
  OPTIMIZING: "shadow-[0_0_6px_1px] shadow-blue-500/20",
  PRE_WARNING: "shadow-[0_0_6px_1px] shadow-yellow-500/20",
  WARNING: "shadow-[0_0_8px_2px] shadow-amber-500/25",
  ESCALATION: "shadow-[0_0_10px_3px] shadow-orange-500/30",
  CRITICAL: "shadow-[0_0_8px_2px] shadow-red-500/30",
  RECOVERY: "shadow-[0_0_6px_1px] shadow-teal-500/20",
}

function clientTime(): string {
  const d = new Date()
  const day = String(d.getDate()).padStart(2, "0")
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
  const year = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${day} ${month} ${year} \u00B7 ${hh}:${mm} UTC`
}

const AI_INSIGHTS = [
  "Environmental equilibrium holding",
  "Telemetry cadence within expected parameters",
  "All sensor arrays operational",
  "Substrate conditions within acceptable drift",
  "Automation response efficiency optimal",
  "System health indicators stable",
  "Ventilation loop integrity nominal",
  "Packet integrity within expected variance",
  "Relay synchronization confirmed",
  "Minor instability probability negligible",
]

function MetricPill({ icon: Icon, value, unit, color }: { icon: typeof Thermometer; value: string; unit: string; color: string }) {
  return (
    <div className={cn("flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-0.5", color)}>
      <Icon className="size-3 opacity-60" />
      <span className="text-[11px] font-semibold tabular-nums">
        {value}{unit}
      </span>
    </div>
  )
}

export function AppHeader() {
  const [time, setTime] = useState("")
  const [insightIdx, setInsightIdx] = useState(0)
  const env = useRealEnvironment()
  const rtTel = useRealTimeTelemetry()
  const tel = useDashboardTelemetry()

  const insight = useMemo(() => {
    if (!rtTel.online) return "Awaiting sensor synchronization"
    if (rtTel.source === "simulated") return "Simulated environmental model active"
    if (rtTel.degraded) return "Stream integrity degraded"
    if (env.state === "CRITICAL") return "Thermal escalation risk elevated — intervention recommended"
    if (env.state === "ESCALATION") return "Environmental instability increasing"
    if (env.state === "WARNING") return "Operational deviation detected — monitoring response"
    if (env.state === "RECOVERY") return "Environmental parameters stabilizing toward equilibrium"
    if (env.state === "PRE_WARNING") return "Minor parameter drift — probability analysis active"
    return AI_INSIGHTS[insightIdx % AI_INSIGHTS.length]
  }, [env.state, rtTel.online, rtTel.source, rtTel.degraded, insightIdx])

  useEffect(() => {
    const id = setTimeout(() => setTime(clientTime()), 0)
    const intervalId = setInterval(() => setTime(clientTime()), 60000)
    return () => { clearTimeout(id); clearInterval(intervalId) }
  }, [])

  useEffect(() => {
    if (!rtTel.online) return
    const id = setInterval(() => setInsightIdx((i) => i + 1), 8000)
    return () => clearInterval(id)
  }, [rtTel.online])

  const hasData = rtTel.temp > 0
  const tempColor = rtTel.temp > 32 ? "text-red-500" : rtTel.temp > 28 ? "text-amber-500" : "text-emerald-500/60"
  const humColor = rtTel.hum < 40 ? "text-red-500" : rtTel.hum < 50 ? "text-amber-500" : "text-emerald-500/60"

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Circle className={cn(
            "size-2.5 fill-emerald-500 text-emerald-500 transition-all duration-500",
            rtTel.source === "simulated" && "fill-amber-500 text-amber-500",
            env.state === "WARNING" && "fill-amber-500 text-amber-500 animate-pulse",
            env.state === "CRITICAL" && "fill-red-500 text-red-500 animate-pulse",
            env.state === "RECOVERY" && "fill-teal-500 text-teal-500",
            env.state === "STABLE" && hasData && rtTel.source === "live" && "animate-pulse"
          )} />
          <span className={cn(
            "text-xs font-medium transition-all duration-500",
            "shadow-[0_0_8px_-2px]",
            env.state === "CRITICAL" ? "text-red-500 shadow-red-500/15" :
            env.state === "WARNING" ? "text-amber-500 shadow-amber-500/10" :
            env.state === "RECOVERY" ? "text-teal-500 shadow-teal-500/10" :
            rtTel.source === "live" ? "text-emerald-500 shadow-emerald-500/10" :
            rtTel.source === "simulated" ? "text-amber-500 shadow-amber-500/10" :
            "text-muted-foreground/40 shadow-none"
          )}>
            System Source
          </span>

          {/* Unified System Source Indicator */}
          {rtTel.source === "live" && (
            <span
              title="ESP32 connected. Displaying live environmental telemetry."
              className="text-[9px] font-semibold text-emerald-500 tracking-wider border border-emerald-500/30 bg-emerald-500/10 rounded px-2 py-0.5 ml-1 cursor-help transition-all duration-300 shadow-[0_0_8px_-2px] shadow-emerald-500/15"
            >
              <Radio className="size-2.5 inline-block mr-1 -mt-px" />
              LIVE DEVICE
            </span>
          )}
          {rtTel.source === "simulated" && (
            <span
              title="No ESP32 detected. Displaying simulated environmental telemetry for demonstration purposes."
              className="text-[9px] font-semibold text-amber-500 tracking-wider border border-amber-500/30 bg-amber-500/10 rounded px-2 py-0.5 ml-1 cursor-help transition-all duration-300 shadow-[0_0_8px_-2px] shadow-amber-500/15"
            >
              <FlaskConical className="size-2.5 inline-block mr-1 -mt-px" />
              SIMULATION
            </span>
          )}
          {rtTel.source === "none" && (
            <span className="text-[9px] font-medium text-muted-foreground/40 tracking-wider border border-border/30 rounded px-2 py-0.5 ml-1">
              NO DEVICE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <MetricPill icon={Thermometer} value={hasData ? tel.temperature.value.toFixed(1) : "--.-"} unit="°C" color={tempColor} />
          <MetricPill icon={Droplets} value={hasData ? tel.humidity.value.toFixed(1) : "--.-"} unit="%" color={humColor} />
          <MetricPill icon={Wind} value={hasData ? String(tel.co2.value) : "---"} unit=" ppm" color="text-muted-foreground/60" />
        </div>

        <div className={cn(
          "rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider ring-1 ring-inset transition-all duration-300",
          BADGE_STYLES[env.state] ?? BADGE_STYLES.STABLE,
          BADGE_GLOW[env.state] ?? BADGE_GLOW.STABLE
        )}>
          {env.label}
        </div>
        {!rtTel.online && rtTel.updatedAt && (
          <div className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5">
            <Activity className="size-3 text-red-500 animate-pulse" />
            <span className="text-[10px] font-medium text-red-500">TELEMETRY LOST</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-2 opacity-0 hover:opacity-100 transition-opacity duration-500">
          <Sparkles className="size-2.5 text-muted-foreground/20" />
          <span className="text-[9px] text-muted-foreground/25 italic">
            {insight}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] tabular-nums text-muted-foreground/40">{time || "\u2014"}</span>
        <ThemeSelector />
        <PresentationToggle />
        <SystemSnapshot />
        <button type="button" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground">
          <Bell className="size-4" />
        </button>
        <OperatorDropdown />
      </div>
    </header>
  )
}
