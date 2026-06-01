"use client"

import { useState, useEffect } from "react"
import { Monitor } from "lucide-react"

import { useRealEnvironment } from "@/lib/useEnvironment"
import type { EnvState } from "@/lib/useEnvironment"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useAutomation } from "@/lib/automation/use-automation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function lcdLine(label: string, value: string, active: boolean, color: string, blink?: boolean) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground/50">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {blink && (
          <span className={cn(
            "size-1 rounded-full animate-pulse",
            color
          )} />
        )}
        <span className={cn(
          "text-[10px] font-semibold tabular-nums tracking-wider transition-all duration-300",
          active ? color : "text-muted-foreground/30"
        )}>
          {value}
        </span>
      </div>
    </div>
  )
}

function lcdStateColor(state: EnvState): string {
  switch (state) {
    case "CRITICAL": return "text-red-500"
    case "WARNING": return "text-amber-500"
    case "RECOVERY": return "text-teal-500"
    case "OPTIMIZING": return "text-blue-500"
    default: return "text-emerald-500"
  }
}

function formatAge(iso: string | null): string {
  if (!iso) return "--"
  const elapsed = Date.now() - new Date(iso).getTime()
  if (elapsed < 1000) return "<1s"
  if (elapsed < 60000) return `${Math.round(elapsed / 1000)}s ago`
  return `${Math.round(elapsed / 60000)}m ago`
}

function computeLatency(iso: string | null): string {
  if (!iso) return "--"
  const elapsed = Date.now() - new Date(iso).getTime()
  if (elapsed < 100) return `${elapsed}ms`
  return `${Math.round(elapsed)}ms`
}

export function LcdStatus() {
  const env = useRealEnvironment()
  const rtTel = useRealTimeTelemetry()
  const { actuators, failsafeState, relayMode } = useAutomation()

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const temp = rtTel.temp
  const hum = rtTel.hum
  const stateColor = lcdStateColor(env.state)
  const fanOn = actuators.find((a) => a.id === "fan")?.state === "on"
  const humOn = actuators.find((a) => a.id === "humidifier")?.state === "on"
  const isOffline = !rtTel.online
  const isSimulated = rtTel.source === "simulated"

  return (
    <Card className={cn(
      "border transition-all duration-200",
      isOffline
        ? "border-amber-500/20 bg-amber-500/[0.02]"
        : isSimulated ? "border-amber-500/10 bg-amber-500/[0.01]" : "border-border/30 bg-muted/20"
    )}>
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2 text-xs">
          <Monitor className={cn(
            "size-3",
            isOffline ? "text-amber-500/60 animate-pulse" : isSimulated ? "text-amber-500/50" : "text-muted-foreground"
          )} />
          ESP32 Display
          <span className={cn(
            "ml-auto text-[9px] font-medium transition-all duration-300",
            isOffline
              ? "text-amber-500"
              : isSimulated ? "text-amber-500" : rtTel.online ? "text-emerald-500" : "text-muted-foreground/30"
          )}>
            {isOffline ? "RECONNECTING" : isSimulated ? "SIMULATION" : rtTel.online ? "LIVE" : "OFFLINE"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 pb-3">
        <div className={cn(
          "rounded-md border bg-background/40 px-1 py-2 font-mono transition-all duration-300",
          isOffline
            ? "border-amber-500/30 animate-[pulse_2s_ease-in-out_infinite]"
            : isSimulated ? "border-amber-500/20" : "border-border/40"
        )}>
          {lcdLine("STATUS", rtTel.online ? failsafeState === "failsafe_active" ? "FAILSAFE" : isSimulated ? "SIMULATION" : env.label : "OFFLINE", true, failsafeState === "failsafe_active" ? "text-red-500" : isSimulated ? "text-amber-500" : stateColor, rtTel.online && !failsafeState)}
          {lcdLine("TEMP", temp > 0 ? `${temp}°C` : "--", temp > 0, stateColor)}
          {lcdLine("HUM", hum > 0 ? `${hum}%` : "--", hum > 0, hum < 50 ? "text-amber-500" : "text-emerald-500")}
          {lcdLine("FAN", fanOn ? "ACTIVE" : "OFF", fanOn, fanOn ? "text-cyan-400" : "text-muted-foreground/30")}
          {lcdLine("HUMIDIFIER", humOn ? "ACTIVE" : "OFF", humOn, humOn ? "text-blue-400" : "text-muted-foreground/30")}
          {lcdLine("UPDATED", hydrated ? formatAge(rtTel.updatedAt) : "--", true, isOffline ? "text-amber-500/60" : "text-muted-foreground/30")}
          {lcdLine("LATENCY", rtTel.online && hydrated ? computeLatency(rtTel.updatedAt) : "--", rtTel.online, "text-muted-foreground/40")}
          {lcdLine("MODE", relayMode === "active_high" ? "RLY HIGH" : "RLY LOW", true, "text-muted-foreground/40")}
        </div>
      </CardContent>
    </Card>
  )
}
