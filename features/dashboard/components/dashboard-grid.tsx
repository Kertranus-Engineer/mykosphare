"use client"

import { useMemo, useState, useEffect } from "react"
import { Thermometer, Droplets, Wind, Wifi, WifiOff, Clock, FlaskConical, Sprout, CheckCircle2, Circle, Target, Heart, DollarSign, ShieldCheck, Zap } from "lucide-react"

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
import { OperationalNarrative } from "./operational-narrative"
import { SystemLogs } from "./system-logs"
import { TelemetryChart } from "./telemetry-chart"
import { TelemetryDebugPanel } from "./telemetry-debug"
import { AutoDemo } from "./auto-demo"
import { MissionStatus } from "./mission-status"
import { QuickStart } from "@/features/quick-start/components/quick-start"
import { Card, CardContent } from "@/components/ui/card"

function executiveSummaryLabel(state: string): string {
  switch (state) {
    case "CRITICAL": return "Critical Alert"
    case "ESCALATION": return "Escalation Active"
    case "WARNING": return "Warning Active"
    case "PRE_WARNING": return "Monitoring"
    case "RECOVERY": return "Recovering"
    case "OPTIMIZING": return "Optimizing"
    default: return "Stable Operation"
  }
}

function executiveSummaryText(state: string, temp: number, hum: number, online: boolean): string {
  if (!online) return "Telemetry stream is currently offline. Simulated data is being displayed for demonstration purposes."
  if (state === "CRITICAL" || state === "ESCALATION") return `Temperature at ${temp.toFixed(1)}°C and humidity at ${hum.toFixed(1)}% have exceeded safe thresholds. Immediate attention recommended.`
  if (state === "WARNING") return `Temperature at ${temp.toFixed(1)}°C and humidity at ${hum.toFixed(1)}% are approaching threshold limits. Active monitoring in progress.`
  if (state === "PRE_WARNING" || state === "OPTIMIZING") return `Minor parameter drift detected. Temperature at ${temp.toFixed(1)}°C, humidity at ${hum.toFixed(1)}%. System is compensating automatically.`
  return `Temperature and humidity remain within expected operational parameters. Telemetry is active and no critical alerts are detected.`
}

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

  const statusText = booting ? "WAITING FOR TELEMETRY"
    : rtTel.stale && rtTel.source === "live" ? "TELEMETRY STALE"
    : rtTel.source === "simulated" ? "SIMULATION ACTIVE"
    : rtTel.degraded ? "TELEMETRY DEGRADED"
    : rtTel.online ? "ESP32 ONLINE"
    : "DEVICE OFFLINE"

  const statusColor = booting ? "bg-blue-500 animate-pulse"
    : rtTel.source === "simulated" ? "bg-amber-500 animate-pulse"
    : rtTel.degraded ? "bg-amber-500 animate-pulse"
    : rtTel.online ? "bg-emerald-500 animate-pulse"
    : "bg-muted-foreground/30"

  const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development"

  return (
    <div className={`flex flex-col gap-3 p-2 ${initDone ? "dashboard-init" : "dashboard-init-hidden"}`}>
      {/* ── Header ────────────────────────────── */}
      <div className="flex flex-col gap-1 py-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Operational Overview</h1>
        <p className="text-sm text-muted-foreground/70">Environmental intelligence platform powered by affordable IoT hardware, cloud analytics and real-time monitoring.</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {["ESP32 Architecture", "Real-Time Telemetry", "Cloud Analytics", "Low-Cost Deployment"].map((badge) => (
            <span key={badge} className="text-[9px] font-medium text-muted-foreground/40 bg-muted/30 border border-border/20 rounded px-1.5 py-0.5 tracking-wide">{badge}</span>
          ))}
        </div>
      </div>

      {isDev && <TelemetryDebugPanel />}

      {/* ── Status Bar ────────────────────────── */}
      <div className="flex items-center justify-between">
        {isDev && <AutoDemo />}
        <div className="flex items-center gap-2 ml-auto">
          {rtTel.source === "simulated" && <div className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1"><FlaskConical className="size-3 text-amber-500" /><span className="text-[10px] font-medium text-amber-500 tracking-wide">SIMULATION</span></div>}
          {rtTel.stale && <div className="flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-1"><Clock className="size-3 text-amber-500/60" /><span className="text-[10px] font-medium text-amber-500/60 tracking-wide">STALE DATA</span></div>}
          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1">
            <div className={cn("size-1.5 rounded-full transition-all duration-500", statusColor)} />
            {rtTel.online ? <Wifi className={cn("size-3", booting ? "text-blue-500/60" : "text-emerald-500/60")} /> : <WifiOff className="size-3 text-muted-foreground/30" />}
            <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60">{statusText}</span>
          </div>
        </div>
      </div>

      {/* ── Live System Status ────────────────── */}
      <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] hover:ring-foreground/20 border-emerald-500/15 shadow-[0_0_12px_-4px] shadow-emerald-500/5">
        <CardContent className="flex flex-col gap-1 py-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[10px] font-semibold tracking-[0.15em] text-emerald-500/60 uppercase shrink-0">Live System Status</span>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1"><div className={cn("size-1.5 rounded-full animate-pulse", rtTel.source === "live" ? "bg-emerald-500" : "bg-amber-500")} /><span className="text-[10px] text-muted-foreground/50">Hardware Source:</span><span className={cn("text-[10px] font-semibold", rtTel.source === "live" ? "text-emerald-500" : "text-amber-500")}>{rtTel.source === "live" ? "Live Device" : "Simulation"}</span></div>
              <span className="text-muted-foreground/15">|</span>
              <div className="flex items-center gap-1"><div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-muted-foreground/50">Telemetry:</span><span className="text-[10px] font-semibold text-emerald-500">ACTIVE</span></div>
              <span className="text-muted-foreground/15">|</span>
              <div className="flex items-center gap-1"><div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-muted-foreground/50">Cloud Link:</span><span className="text-[10px] font-semibold text-emerald-500">ACTIVE</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground/40">Current Mode:</span>
            <span className={cn("font-semibold", rtTel.source === "live" ? "text-emerald-500" : "text-amber-500")}>{rtTel.source === "live" ? "Live ESP32 Telemetry" : "Simulation Demonstration"}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-muted-foreground/40">Platform Version: 1.0</span>
            <span className="text-muted-foreground/15">|</span>
            <span className="text-[9px] font-medium text-cyan-500/60 border border-cyan-500/20 bg-cyan-500/5 rounded px-1.5 py-0.5">Challenge Build</span>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Strip ─────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { icon: Thermometer, label: "Temp", value: hasData ? `${tempVal.toFixed(1)}°C` : "--", color: tempCritical ? "text-red-500" : tempWarning ? "text-amber-500" : "text-emerald-500" },
          { icon: Droplets, label: "Hum", value: hasData ? `${humVal.toFixed(1)}%` : "--", color: humCritical ? "text-red-500" : humWarning ? "text-amber-500" : "text-emerald-500" },
          { icon: Wind, label: "CO₂", value: hasData ? `${co2Val}` : "--", color: "text-blue-500" },
          { icon: Heart, label: "Health", value: `${mem.facilityHealth}%`, color: mem.facilityHealth >= 85 ? "text-emerald-500" : mem.facilityHealth >= 60 ? "text-amber-500" : "text-red-500" },
          { icon: DollarSign, label: "Cost", value: "~$89", color: "text-violet-500" },
        ].map((kpi, i) => (
          <div key={kpi.label} className="flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/20 px-2.5 py-1 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: `${i * 40}ms` }}>
            <kpi.icon className={cn("size-3", kpi.color)} />
            <span className="text-[10px] font-semibold tabular-nums text-foreground/70">{kpi.value}</span>
            <span className="text-[9px] text-muted-foreground/40">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* ── Mission Status ────────────────────── */}
      <MissionStatus />

      {/* ── Compact Metrics 2x2 ────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard compact icon={Thermometer} label="Temperature" value={tempVal} unit="°C" decimals={1} trend={tel.temperature.trend} delta={tel.temperature.delta} critical={tempCritical} warning={tempWarning} />
        <MetricCard compact icon={Droplets} label="Humidity" value={humVal} unit="%" decimals={1} trend={tel.humidity.trend} delta={tel.humidity.delta} critical={humCritical} warning={humWarning} />
        <MetricCard compact icon={Wind} label="CO₂" value={co2Val} unit=" ppm" decimals={0} trend={tel.co2.trend} delta={tel.co2.delta} />
        <MetricCard compact icon={Zap} label="Energy" value={tel.energyUsage.value} unit=" kWh" decimals={1} trend={tel.energyUsage.trend} delta={tel.energyUsage.delta} />
      </div>

      {/* ── AI Analysis + Executive Summary ───── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="section-tint-intelligence rounded-lg"><AiAnalysisPanel /></div>
        <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] hover:ring-foreground/20 border-blue-500/10 shadow-[0_0_12px_-4px] shadow-blue-500/5">
          <CardContent className="flex flex-col gap-2 relative z-10 py-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              <span className="text-xs font-semibold tracking-tight text-foreground">Executive Summary</span>
              <span className={cn("ml-auto text-[10px] font-semibold px-2 py-0.5 rounded border", env.state === "CRITICAL" || env.state === "ESCALATION" ? "text-red-500 bg-red-500/10 border-red-500/20" : env.state === "WARNING" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20")}>
                {executiveSummaryLabel(env.state)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground/55">
              {executiveSummaryText(env.state, tempVal, humVal, rtTel.online)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Explore Platform ──────────────────── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          { label: "Architecture", desc: "Understand how the platform works.", href: "/dashboard/architecture", color: "text-blue-500", bg: "bg-blue-500/5", border: "border-blue-500/15" },
          { label: "Prototype", desc: "Inspect the hardware implementation.", href: "/dashboard/prototype", color: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/15" },
          { label: "Applications", desc: "Discover deployment opportunities.", href: "/dashboard/applications", color: "text-violet-500", bg: "bg-violet-500/5", border: "border-violet-500/15" },
        ].map((link, i) => (
          <a key={link.label} href={link.href} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 hover:scale-[1.01] hover:ring-foreground/10", link.bg, link.border)} style={{ animationDelay: `${i * 60}ms` }}>
            <div className={cn("size-1.5 rounded-full", link.color.replace("text-", "bg-"))} />
            <div className="flex flex-col min-w-0"><span className={cn("text-[11px] font-semibold tracking-tight", link.color)}>{link.label}</span><span className="text-[9px] text-muted-foreground/50 leading-tight">{link.desc}</span></div>
            <span className="text-[9px] text-muted-foreground/25 ml-auto shrink-0">→</span>
          </a>
        ))}
      </div>

      {/* ── Why MYKOSPHARE? ───────────────────── */}
      <Card size="sm" className={cn("transition-all duration-300 relative overflow-hidden hover:scale-[1.01] hover:ring-foreground/20 border-emerald-500/20 shadow-[0_0_24px_-8px] shadow-emerald-500/15")}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16,185,129,0.5), transparent 70%)" }} />
        <CardContent className="flex items-center gap-4 relative z-10 py-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Sprout className="size-5 text-emerald-500" />
            <div className="absolute -right-0.5 -top-0.5"><div className="size-2 rounded-full bg-emerald-500 animate-pulse" /></div>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold tracking-tight text-emerald-400">Why MYKOSPHARE?</span>
            <p className="text-xs leading-relaxed text-foreground/50 mt-0.5">
              Traditional environmental monitoring platforms often require expensive proprietary hardware and complex infrastructure.
            </p>
            <p className="text-xs leading-relaxed text-foreground/50 mt-1">
              MYKOSPHARE demonstrates how affordable ESP32-based hardware, cloud telemetry and modern web technologies can provide real-time environmental intelligence at a fraction of traditional deployment costs.
            </p>
          </div>
          <div className="hidden sm:flex shrink-0 flex-col items-center gap-1 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-4 py-2 ml-auto">
            <span className="text-[9px] text-emerald-500/50 uppercase tracking-wider font-medium">Prototype Cost</span>
            <span className="text-sm font-bold text-emerald-500 tabular-nums">&lt; $100 USD</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Chamber + LCD + Alerts ────────────── */}
      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="flex-1 xl:flex-[3] rounded-lg section-tint-chamber"><ChamberPanel /></div>
        <div className="flex flex-col gap-3 xl:flex-[1.2]"><LcdStatus /><ActuatorBar /><AlertPanel /></div>
      </div>

      <OperationalNarrative />

      {/* ── Telemetry Trends + Logs ───────────── */}
      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="flex-1 xl:flex-[2]"><TelemetryChart /></div>
        <div className="flex-1"><SystemLogs /></div>
      </div>

      {/* ── Low Cost Deployment ───────────────── */}
      <Card size="sm" className="transition-all duration-300 relative overflow-hidden hover:scale-[1.01] hover:ring-foreground/20 border-emerald-500/15 shadow-[0_0_16px_-4px] shadow-emerald-500/5">
        <CardContent className="flex items-center gap-3 relative z-10 py-2.5">
          <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20"><Sprout className="size-4 text-emerald-500" /><div className="absolute -right-0.5 -top-0.5"><div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /></div></div>
          <div className="flex flex-col min-w-0 flex-1"><span className="text-xs font-semibold tracking-tight text-emerald-400">Low Cost Deployment</span><p className="text-[11px] leading-relaxed text-foreground/50">Traditional monitoring solutions can cost thousands. <span className="text-foreground/65 font-medium">MYKOSPHARE</span> uses affordable ESP32-based hardware and open technologies to drastically reduce implementation costs.</p></div>
          <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5"><span className="text-xs font-semibold text-emerald-500 tabular-nums">~$89</span><span className="text-[9px] text-emerald-500/40 font-medium uppercase tracking-wider">total</span></div>
        </CardContent>
      </Card>

      <QuickStart />

      {/* ── Project Info ──────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/15 to-transparent" />
        <span className="text-[9px] font-mono font-medium tracking-[0.2em] text-muted-foreground/40 uppercase">Project Information</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-foreground/15 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] hover:ring-foreground/20 border-blue-500/10">
          <CardContent className="flex items-start gap-3 relative z-10 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 mt-0.5"><Target className="size-4 text-blue-500" /></div>
            <div className="flex flex-col min-w-0"><span className="text-xs font-semibold tracking-tight text-blue-400">System Purpose</span><p className="text-[11px] leading-relaxed text-foreground/50">Environmental intelligence and monitoring platform built around low-cost IoT infrastructure.</p></div>
          </CardContent>
        </Card>
        <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] hover:ring-foreground/20 border-emerald-500/10">
          <CardContent className="flex flex-col gap-2 relative z-10 py-2.5">
            <span className="text-xs font-semibold tracking-tight text-emerald-400">Deployment Readiness</span>
            <div className="flex items-center gap-1.5">
              {[{ label: "Prototype", done: true },{ label: "Testing", done: true },{ label: "Pilot", done: false, active: true },{ label: "Production", done: false }].map((stage, idx, arr) => (
                <div key={stage.label} className="flex items-center gap-1.5 flex-1">
                  <div className={cn("flex items-center gap-1 rounded px-1.5 py-1 flex-1 justify-center border", stage.done ? "bg-emerald-500/10 border-emerald-500/20" : stage.active ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20" : "bg-muted/20 border-border/20")}>
                    {stage.done ? <CheckCircle2 className="size-3 text-emerald-500" /> : stage.active ? <div className="size-2 rounded-full bg-blue-500 animate-pulse" /> : <Circle className="size-3 text-muted-foreground/30" />}
                    <span className={cn("text-[9px] font-medium", stage.done ? "text-emerald-500" : stage.active ? "text-blue-400" : "text-muted-foreground/40")}>{stage.label}</span>
                  </div>
                  {idx < arr.length - 1 && <div className={cn("h-px w-2", stage.done ? "bg-emerald-500/30" : "bg-muted-foreground/10")} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Why MYKOSPHARE Matters ────────────── */}
      <Card size="sm" className="transition-all duration-300 relative overflow-hidden hover:scale-[1.01] hover:ring-foreground/20 border-cyan-500/15 shadow-[0_0_20px_-6px] shadow-cyan-500/5">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(6,182,212,0.4), transparent 70%)" }} />
        <CardContent className="flex items-start gap-4 relative z-10 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20"><Sprout className="size-4 text-cyan-500" /></div>
          <div className="flex flex-col gap-1 min-w-0 flex-1"><span className="text-xs font-semibold tracking-tight text-cyan-400">Why MYKOSPHARE Matters</span><p className="text-xs leading-relaxed text-foreground/55">Environmental monitoring should be accessible. By combining low-cost hardware, cloud analytics and open technologies, MYKOSPHARE reduces barriers to deployment while maintaining professional monitoring capabilities.</p></div>
        </CardContent>
      </Card>

      {/* ── System Footer ──────────────────────── */}
      <div className="flex items-center gap-3 text-[9px] text-muted-foreground/20 font-mono tracking-wider overflow-hidden">
        <span className={cn(mem.facilityPersonality === "damaged" ? "text-red-500/30" : mem.facilityPersonality === "tired" ? "text-amber-500/30" : "text-emerald-500/30")}>[SYS]</span>
        <span>{mem.facilityPersonality === "damaged" ? "DAMAGED" : mem.facilityPersonality === "tired" ? "TIRED" : "HEALTHY"}</span>
        <span className="text-muted-foreground/10">·</span><span className="text-blue-500/30">[LOAD]</span><span>STRESS {mem.stressIndex}% · FATIGUE {mem.fatigue}%</span>
        <span className="text-muted-foreground/10">·</span><span className="text-violet-500/30">[AI]</span>
        <span>{env.state === "CRITICAL" ? "escalation risk elevated" : env.state === "WARNING" ? "deviation probability monitoring" : env.state === "RECOVERY" ? "equilibrium restoration in progress" : "environmental confidence holding"}</span>
        <span className="text-muted-foreground/10">·</span><span className="text-muted-foreground/20">OPR L2 · {initDone ? mem.systemAge : "--"} · {mem.facilityReputation.label}</span>
      </div>
    </div>
  )
}
