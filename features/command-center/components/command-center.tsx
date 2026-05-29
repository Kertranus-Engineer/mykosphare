"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import {
  Terminal as TerminalIcon,
  Zap,
  Wind,
  RotateCcw,
  AlertTriangle,
  Activity,
  Fan,
  Droplets,
  Flame,
  Power,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCommands } from "@/lib/commands/use-commands"
import { useUnifiedOperationalState } from "@/lib/unified/use-unified"
import { useAutomation } from "@/lib/automation/use-automation"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useOpEvents } from "@/lib/events/bus"
import { setDemoActive } from "@/lib/useTelemetry"
import type { CommandType } from "@/lib/commands/types"
import { CARD_HOVER } from "@/lib/styles/tokens"

const COMMAND_OPTIONS: { type: CommandType; icon: typeof TerminalIcon; color: string; bg: string }[] = [
  { type: "airflow", icon: Wind, color: "text-blue-500", bg: "bg-blue-500/10" },
  { type: "relay-power", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
  { type: "mesh-restart", icon: RotateCcw, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { type: "emergency-isolation", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
]

export function CommandCenter() {
  const unified = useUnifiedOperationalState()
  const { commands, issueCommand, clearCompleted, activeCount } = useCommands()
  const { actuators, toggleManual, setAutoMode, allOff, failsafeState, relayMode, toggleRelayMode } = useAutomation()
  const rtTel = useRealTimeTelemetry()
  const opEvents = useOpEvents(undefined, 40)
  const terminalRef = useRef<HTMLDivElement>(null)
  const [emergencyActive, setEmergencyActive] = useState(false)
  const [opsFlash, setOpsFlash] = useState(false)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0
    }
  }, [opEvents.length])

  // Count-up pulse on metric change
  useEffect(() => {
    setOpsFlash(true)
    const t = setTimeout(() => setOpsFlash(false), 400)
    return () => clearTimeout(t)
  }, [activeCount, unified.incidentSummary.openIncidents])

  async function triggerEmergencyShutdown() {
    setEmergencyActive(true)
    await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) })
    setDemoActive(true)

    // Push through critical thermal spike
    const steps = [
      { temp: 28, hum: 76, delay: 1000 },
      { temp: 31, hum: 72, delay: 1200 },
      { temp: 34, hum: 65, delay: 1500 },
      { temp: 32, hum: 60, delay: 2000 },
      { temp: 28, hum: 58, delay: 2000 },
      { temp: 25, hum: 60, delay: 1500 },
    ]
    for (const s of steps) {
      await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temp: s.temp, hum: s.hum }) })
      await new Promise((r) => setTimeout(r, s.delay))
    }

    await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }) })
    setDemoActive(false)
    setEmergencyActive(false)
  }

  const maxSeverity = useMemo(() => {
    const sev = unified.systemHealth.map((s) => s.impact)
    if (sev.includes("critical")) return "critical"
    if (sev.includes("severe")) return "severe"
    return "none"
  }, [unified.systemHealth])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground/70">Real-time operational command execution</p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 animate-[command-pulse_2s_ease-in-out_infinite]">
              <Activity className="size-3 text-amber-500" />
              <span className="text-[10px] font-medium text-amber-500">{activeCount} active</span>
            </div>
          )}
          {maxSeverity === "critical" && (
            <div className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1">
              <AlertTriangle className="size-3 text-red-500" />
              <span className="text-[10px] font-medium text-red-500">CRITICAL</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-emerald-500" />
                Actuator Control
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {actuators.map((a) => {
                const Icon = a.type === "fan" ? Fan : a.type === "humidifier" ? Droplets : Flame
                const isOn = a.state === "on"
                const isAuto = a.mode === "automatic"
                const isDisabled = a.type === "heater"
                return (
                  <div key={a.id} className={cn(
                    "rounded-lg border p-3 transition-all",
                    isOn ? "border-emerald-500/30 bg-emerald-500/5" :
                    isDisabled ? "border-border/20 bg-muted/10" : "border-border/40"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn(
                          "size-4",
                          isOn ? "text-emerald-500" + (a.type === "fan" ? " animate-spin" : "") :
                          isAuto && !isDisabled ? "text-muted-foreground/50" : "text-muted-foreground/20"
                        )} style={isOn && a.type === "fan" ? { animationDuration: "3s" } : undefined} />
                        <span className="text-[11px] font-medium text-foreground/80">{a.label}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-medium",
                        isOn ? "text-emerald-500" : isDisabled ? "text-muted-foreground/20" : "text-muted-foreground/40"
                      )}>
                        {isOn ? "ACTIVE" : isDisabled ? "DISABLED" : isAuto ? "AUTO" : "MANUAL"}
                      </span>
                    </div>
                    {!isDisabled && (
                      <div className="flex gap-1">
                        <button onClick={() => toggleManual(a.id, "on")} className={cn(
                          "flex-1 rounded py-1 text-[10px] font-medium transition-all",
                          "active:scale-[0.97]",
                          isOn ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30" : "bg-muted/30 text-muted-foreground/50 hover:bg-emerald-500/10 hover:text-emerald-500"
                        )}>ON</button>
                        <button onClick={() => toggleManual(a.id, "off")} className={cn(
                          "flex-1 rounded py-1 text-[10px] font-medium transition-all",
                          "active:scale-[0.97]",
                          !isOn && !isAuto ? "bg-red-500/15 text-red-500 ring-1 ring-red-500/30" : "bg-muted/30 text-muted-foreground/50 hover:bg-red-500/10 hover:text-red-500"
                        )}>OFF</button>
                        <button onClick={() => setAutoMode(a.id)} className={cn(
                          "flex-1 rounded py-1 text-[10px] font-medium transition-all",
                          "active:scale-[0.97]",
                          isAuto ? "bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30" : "bg-muted/30 text-muted-foreground/50 hover:bg-blue-500/10 hover:text-blue-500"
                        )}>AUTO</button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="col-span-full flex items-center justify-between mt-1 pt-2 border-t border-border/30">
                <button onClick={toggleRelayMode} className={cn(
                  "rounded px-2 py-1 text-[10px] font-medium transition-all active:scale-[0.97]",
                  relayMode === "active_low" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  RELAY: {relayMode === "active_high" ? "HIGH" : "LOW"}
                </button>
                <span className="text-[9px] text-muted-foreground/40">
                  {failsafeState === "failsafe_active" ? "FAILSAFE ACTIVE" : failsafeState === "recovering" ? "RECOVERING" : rtTel.online ? "ESP32 ONLINE" : "ESP32 OFFLINE"}
                </span>
                <button onClick={allOff} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-red-500/70 hover:bg-red-500/10 active:scale-[0.97] transition-all">
                  <Power className="size-3" /> ALL OFF
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TerminalIcon className="size-4 text-cyan-500" />
                Live Operational Terminal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={terminalRef} className="relative h-[240px] overflow-y-auto font-mono text-[10.5px] leading-relaxed bg-black/45 rounded-md p-2.5 border border-border/30">
                <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.04]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)",
                    backgroundSize: "100% 3px",
                  }}
                />
                <div className="space-y-0.5">
                  {opEvents.length === 0 && (
                    <div className="text-[10px] text-muted-foreground/30 py-2 px-1 flex items-center gap-1">
                      <span className="text-emerald-500/80 animate-pulse">&#9611;</span>
                      terminal awaiting events...
                    </div>
                  )}
                  {opEvents.slice(0, 25).map((evt, i) => (
                    <div key={evt.id} className={cn(
                      "flex gap-1.5 text-[10px] transition-opacity duration-1000",
                      i === 0 ? "opacity-100" : i > 15 ? "opacity-35" : i > 10 ? "opacity-55" : "opacity-75"
                    )}>
                      <span className={cn(
                        "shrink-0 w-10 tabular-nums font-medium",
                        evt.severity === "critical" ? "text-red-500/60" :
                        evt.severity === "warning" ? "text-amber-500/60" :
                        evt.severity === "success" ? "text-emerald-500/60" :
                        "text-cyan-500/50"
                      )}>
                        {evt.severity === "critical" ? "ALRT" :
                         evt.severity === "warning" ? "WARN" :
                         evt.severity === "success" ? " OK " :
                         "SYS"}
                      </span>
                      <span className="text-muted-foreground/35 shrink-0 w-14 tabular-nums font-medium">{evt.time}</span>
                      <span className={cn(
                        i === 0 && "text-shadow-[0_0_6px_rgba(16,185,129,0.15)]",
                        evt.severity === "critical" ? "text-red-500/80" :
                        evt.severity === "warning" ? "text-amber-500/70" :
                        evt.severity === "success" ? "text-emerald-500/70" :
                        "text-muted-foreground/55"
                      )}>
                        {evt.message}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 pt-1.5 border-t border-border/20 mt-1">
                  <span className="text-[10px] text-emerald-500/80 animate-[breathe_2.5s_ease-in-out_infinite]">&#9611;</span>
                  <span className="text-[9px] text-muted-foreground/40">
                    seq {opEvents[0]?.seq ?? "#0000"} · {opEvents.length} events · {rtTel.online ? "LIVE" : "OFFLINE"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Simulation Events */}
          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-blue-500" />
                Simulation Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => triggerEmergencyShutdown()}
                disabled={emergencyActive}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-[10px] font-semibold tracking-wide transition-all duration-200",
                  "active:scale-[0.97]",
                  emergencyActive
                    ? "border-red-500/30 bg-red-500/10 text-red-400 animate-pulse"
                    : "border-amber-500/20 bg-amber-500/5 text-amber-500/80 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-[0_0_14px_-4px] hover:shadow-amber-500/15"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="size-3.5" />
                  {emergencyActive ? "CONTAINING..." : "Simulate Thermal Spike"}
                </div>
                <div className="mt-1 text-[8px] text-amber-500/30 text-center tracking-normal">
                  Warning → Critical → Auto-recovery
                </div>
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) })
                  setDemoActive(true)
                  await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temp: 26.5, hum: 72 }) })
                }}
                className="w-full rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-[10px] font-semibold text-blue-500/80 tracking-wide hover:border-blue-500/40 hover:bg-blue-500/10 transition-all duration-200 active:scale-[0.97]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Wind className="size-3.5" />
                  Run Humidity Drift
                </div>
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) })
                  setDemoActive(true)
                  await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ temp: 24.5, hum: 62 }) })
                }}
                className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-[10px] font-semibold text-emerald-500/80 tracking-wide hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200 active:scale-[0.97]"
              >
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw className="size-3.5" />
                  Initiate Recovery Cycle
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Live Controls */}
          <Card className={cn(CARD_HOVER)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Power className="size-4 text-amber-500/70" />
                Live Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <MetricRow label="Active Commands" value={String(activeCount)} color="text-foreground" flash={opsFlash} />
              <MetricRow label="Open Incidents" value={String(unified.incidentSummary.openIncidents)} color="text-red-500" flash={unified.incidentSummary.openIncidents > 0} />
              <MetricRow label="System Cohesion" value={`${unified.crossLayer.overallCohesion}%`} color="text-emerald-500" flash={false} />
              <MetricRow label="ESP32 Status" value={rtTel.online ? "ONLINE" : "OFFLINE"} color={rtTel.online ? "text-emerald-500" : "text-red-500"} flash={false} />
              <div className="pt-2">
                <button onClick={allOff} className="w-full rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-[10px] font-medium text-red-500/60 hover:bg-red-500/10 active:scale-[0.97] transition-all">
                  All Actuators Off
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color, flash }: { label: string; value: string; color: string; flash: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-300",
      flash ? "bg-emerald-500/5" : "bg-muted/20"
    )}>
      <span className="text-[10px] text-muted-foreground/60">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums transition-all duration-300", color, flash && "animate-pulse")}>
        {value}
      </span>
    </div>
  )
}
