"use client"

import { useState, useCallback } from "react"
import { Brain, X, Send, ShieldCheck, AlertTriangle, TrendingUp, } from "lucide-react"

import { useRealEnvironment } from "@/lib/useEnvironment"
import { useDashboardTelemetry, useRealTimeTelemetry } from "@/lib/useTelemetry"
import { cn } from "@/lib/utils"

const COPILOT_RESPONSES: Record<string, string[]> = {
  temp: [
    "Temperature is currently stable within operational range. No corrective action needed.",
    "Slight thermal drift detected. Ventilation system is actively compensating.",
    "Elevated temperature. Fan system has been engaged. Monitor for recovery.",
    "Critical thermal threshold. Emergency cooling active. Chamber integrity being maintained.",
  ],
  hum: [
    "Humidity levels nominal. Substrate moisture balance within target parameters.",
    "Humidity variance detected. Recovery measures are active. Monitoring stabilization.",
    "Low humidity alert. Humidifier system has been activated. Expect recovery within 3-5 minutes.",
  ],
  general: [
    "All systems operating within specified parameters. Environmental conditions nominal.",
    "Active adjustments underway. Chamber is self-correcting minor deviations.",
    "Several subsystems responding to environmental changes. Automation maintaining control.",
    "System intelligence monitoring 12 parameters. No immediate intervention required.",
  ],
}

export function AiCopilot() {
  const [open, setOpen] = useState(false)
  const env = useRealEnvironment()
  const tel = useDashboardTelemetry()
  const rtTel = useRealTimeTelemetry()

  const getResponse = useCallback(() => {
    if (!rtTel.online) return "Telemetry stream interrupted. Awaiting sensor reconnection. All cached states preserved."
    if (!rtTel.temp) return "Awaiting initial telemetry data. Sensor synchronization in progress."

    const temp = tel.temperature.value
    const hum = tel.humidity.value
    const responses: string[] = []

    if (temp > 32) responses.push(COPILOT_RESPONSES.temp[3])
    else if (temp > 28) responses.push(COPILOT_RESPONSES.temp[2])
    else if (temp > 27) responses.push(COPILOT_RESPONSES.temp[1])
    else responses.push(COPILOT_RESPONSES.temp[0])

    if (hum < 40) responses.push(COPILOT_RESPONSES.hum[2])
    else if (hum < 50) responses.push(COPILOT_RESPONSES.hum[1])
    else responses.push(COPILOT_RESPONSES.hum[0])

    responses.push(COPILOT_RESPONSES.general[Math.min(responses.length, 3)])
    return responses.join(" ")
  }, [rtTel, tel])

  const StatusIcon = env.icon

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex size-11 items-center justify-center rounded-full border shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
          env.state === "CRITICAL"
            ? "border-red-500/30 bg-red-500/10 text-red-500 shadow-red-500/20"
            : env.state === "WARNING"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-amber-500/20"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500 shadow-emerald-500/10"
        )}
        title="MYKO AI Assistant"
      >
        <Brain className={cn("size-5", env.state !== "STABLE" && "animate-pulse")} />
        <div className={cn(
          "absolute -top-1 -right-1 size-3 rounded-full border-2 border-background",
          env.state === "CRITICAL" ? "bg-red-500" : env.state === "WARNING" ? "bg-amber-500" : "bg-emerald-500"
        )} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-emerald-500" />
          <span className="text-xs font-semibold tracking-wide">MYKO AI</span>
        </div>
        <div className="flex items-center gap-1">
          <StatusIcon className={cn("size-3.5", env.iconColor)} />
          <span className="text-[9px] font-medium text-muted-foreground/50">{env.label}</span>
          <button type="button" onClick={() => setOpen(false)} className="ml-1 rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground/80">
          {getResponse()}
        </p>
      </div>
      <div className="border-t border-border/40 px-4 py-2 flex items-center gap-2">
        <div className="flex-1 flex gap-1.5">
          {[ShieldCheck, TrendingUp, AlertTriangle].map((Icon, i) => (
            <div key={i} className={cn(
              "flex size-6 items-center justify-center rounded text-[8px]",
              i === 0 ? "text-emerald-500/50 bg-emerald-500/5" :
              i === 1 ? "text-blue-500/50 bg-blue-500/5" : "text-amber-500/50 bg-amber-500/5"
            )}>
              <Icon className="size-3" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded border border-border/30 bg-muted/20 px-2 py-1">
          <Send className="size-2.5 text-muted-foreground/30" />
          <span className="text-[9px] text-muted-foreground/20">ask</span>
        </div>
      </div>
    </div>
  )
}
