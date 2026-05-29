"use client"

import { memo } from "react"
import {
  ShieldCheck,
  Radio,
  Bell,
  Heart,
  DollarSign,
  Sprout,
  Wifi,
  WifiOff,
  Target,
  CheckCircle2,
  Circle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useRealEnvironment } from "@/lib/useEnvironment"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useOperationalMemory } from "@/lib/operational/memory"
import { OPERATIONAL_STATUS, scoreToMeta } from "@/lib/styles/tokens"

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subValue?: string
  accentColor: string
  accentBg: string
  accentBorder: string
  accentGlow: string
  delayed?: number
}

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  accentColor,
  accentBg,
  accentBorder,
  accentGlow,
  delayed = 0,
}: StatCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "flex-1 transition-all duration-300 relative overflow-hidden opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
        "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
        accentGlow,
      )}
      style={{ animationDelay: `${delayed}ms` }}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-px",
        )}
        style={{
          background: `linear-gradient(90deg, transparent, currentColor, transparent)`,
          opacity: 0.1,
          animation: "sweep-line 4s ease-in-out infinite",
        }}
      />
      <CardContent className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className={cn("relative flex size-9 items-center justify-center rounded-lg", accentBg, accentBorder, "border")}>
            <Icon className={cn("size-[18px]", accentColor)} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className={cn("text-lg font-bold tracking-tight tabular-nums", accentColor)}>
            {value}
          </span>
          {subValue && (
            <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
              {subValue}
            </span>
          )}
          <span className="text-[11px] font-medium text-foreground/55 tracking-wide">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
})

function AnimatedValue({ value, color }: { value: number; color: string }) {
  return (
    <span className={cn("text-lg font-bold tracking-tight tabular-nums", color)}>
      {value > 0 ? value : "--"}
    </span>
  )
}

export const MissionStatus = memo(function MissionStatus() {
  const env = useRealEnvironment()
  const rtTel = useRealTimeTelemetry()
  const mem = useOperationalMemory()
  const envMeta = scoreToMeta(mem.facilityHealth)

  const activeSensors = [
    rtTel.online ? "Temperature" : null,
    rtTel.online ? "Humidity" : null,
  ].filter(Boolean)

  const activeAlerts = env.alerts.filter(
    (a) => a.label !== "Routine Check"
  ).length

  const deployCost = `${89}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]" style={{ animationDelay: "50ms" }}>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <span className="text-[9px] font-mono font-medium tracking-[0.2em] text-emerald-500/60 uppercase">
          Mission Status
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Current Environment Status */}
        <StatCard
          icon={env.icon}
          label="Environment"
          value={env.label}
          accentColor={env.color}
          accentBg="bg-emerald-500/10"
          accentBorder="border-emerald-500/20"
          accentGlow="shadow-[0_0_12px_-4px] shadow-emerald-500/5"
          delayed={100}
        />

        {/* Active Sensors */}
        <StatCard
          icon={rtTel.online ? Wifi : WifiOff}
          label="Active Sensors"
          value={activeSensors.length > 0 ? `${activeSensors.length}` : "0"}
          subValue={activeSensors.length > 0 ? activeSensors.join(" · ") : "Offline"}
          accentColor={rtTel.online ? "text-blue-500" : "text-muted-foreground/50"}
          accentBg={rtTel.online ? "bg-blue-500/10" : "bg-muted/50"}
          accentBorder={rtTel.online ? "border-blue-500/20" : "border-border/30"}
          accentGlow={rtTel.online ? "shadow-[0_0_12px_-4px] shadow-blue-500/5" : ""}
          delayed={150}
        />

        {/* Active Alerts */}
        <StatCard
          icon={Bell}
          label="Active Alerts"
          value={`${activeAlerts}`}
          accentColor={activeAlerts > 0 ? "text-amber-500" : "text-emerald-500"}
          accentBg={activeAlerts > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}
          accentBorder={activeAlerts > 0 ? "border-amber-500/20" : "border-emerald-500/20"}
          accentGlow={activeAlerts > 0 ? "shadow-[0_0_12px_-4px] shadow-amber-500/5" : "shadow-[0_0_12px_-4px] shadow-emerald-500/5"}
          delayed={200}
        />

        {/* System Health */}
        <StatCard
          icon={Heart}
          label="System Health"
          value={`${mem.facilityHealth}%`}
          accentColor={envMeta.color}
          accentBg={envMeta.bg}
          accentBorder={envMeta.border}
          accentGlow={envMeta.glow}
          delayed={250}
        />

        {/* Estimated Deployment Cost */}
        <StatCard
          icon={DollarSign}
          label="Deployment Cost"
          value={`$${deployCost}`}
          subValue="One-time"
          accentColor="text-violet-500"
          accentBg="bg-violet-500/10"
          accentBorder="border-violet-500/20"
          accentGlow="shadow-[0_0_12px_-4px] shadow-violet-500/5"
          delayed={300}
        />
      </div>

      {/* Low Cost Deployment Banner */}
      <Card
        size="sm"
        className={cn(
          "transition-all duration-300 relative overflow-hidden opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
          "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
          "border-emerald-500/15 shadow-[0_0_16px_-4px] shadow-emerald-500/5",
        )}
        style={{ animationDelay: "400ms" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16,185,129,0.3) 2px, rgba(16,185,129,0.3) 4px)",
            animation: "shift-gradient 3s linear infinite",
            backgroundSize: "100% 4px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.15), transparent)",
            animation: "sweep-line 4s ease-in-out infinite",
          }}
        />
        <CardContent className="flex items-center gap-4 relative z-10 py-3">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Sprout className="size-6 text-emerald-500" />
            <div className="absolute -right-1 -top-1">
              <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-sm font-semibold tracking-tight text-emerald-400">
              Low Cost Deployment
            </span>
            <p className="text-[12px] leading-relaxed text-foreground/55">
              Traditional monitoring solutions can cost thousands of dollars.{" "}
              <span className="text-foreground/70 font-medium">MYKOSPHARE</span> uses affordable
              ESP32-based hardware and open technologies to drastically reduce implementation costs.
            </p>
          </div>
          <div className="hidden sm:flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 ml-auto">
            <span className="text-xs font-semibold text-emerald-500 tabular-nums">
              ~${deployCost}
            </span>
            <span className="text-[9px] text-emerald-500/40 font-medium uppercase tracking-wider">
              total
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* System Purpose */}
        <Card
          size="sm"
          className={cn(
            "transition-all duration-300 relative overflow-hidden opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
            "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
            "border-blue-500/10",
          )}
          style={{ animationDelay: "450ms" }}
        >
          <CardContent className="flex items-start gap-3 relative z-10 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 mt-0.5">
              <Target className="size-[18px] text-blue-500" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-semibold tracking-tight text-blue-400">
                System Purpose
              </span>
              <p className="text-[12px] leading-relaxed text-foreground/55">
                Environmental intelligence and monitoring platform built around low-cost IoT infrastructure.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Readiness */}
        <Card
          size="sm"
          className={cn(
            "transition-all duration-300 relative overflow-hidden opacity-0 animate-[fade-in-up_0.4s_ease-out_forwards]",
            "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
            "border-emerald-500/10",
          )}
          style={{ animationDelay: "500ms" }}
        >
          <CardContent className="flex flex-col gap-3 relative z-10 py-3">
            <span className="text-sm font-semibold tracking-tight text-emerald-400">
              Deployment Readiness
            </span>
            <div className="flex items-center gap-2">
              {[
                { label: "Prototype", done: true },
                { label: "Testing", done: true },
                { label: "Pilot", done: false, active: true },
                { label: "Production", done: false },
              ].map((stage, idx, arr) => (
                <div key={stage.label} className="flex items-center gap-2 flex-1">
                  <div className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1.5 flex-1 justify-center border",
                    stage.done ? "bg-emerald-500/10 border-emerald-500/20" :
                    stage.active ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20" :
                    "bg-muted/20 border-border/20",
                  )}>
                    {stage.done ? (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    ) : stage.active ? (
                      <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    ) : (
                      <Circle className="size-3 text-muted-foreground/30" />
                    )}
                    <span className={cn(
                      "text-[10px] font-medium",
                      stage.done ? "text-emerald-500" :
                      stage.active ? "text-blue-400" :
                      "text-muted-foreground/40",
                    )}>
                      {stage.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={cn(
                      "h-px w-2",
                      stage.done ? "bg-emerald-500/30" : "bg-muted-foreground/10",
                    )} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
