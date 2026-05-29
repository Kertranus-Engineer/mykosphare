"use client"

import { memo } from "react"
import {
  AlertTriangle,
  Bell,
  Heart,
  DollarSign,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useRealEnvironment } from "@/lib/useEnvironment"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"
import { useOperationalMemory } from "@/lib/operational/memory"
import { scoreToMeta } from "@/lib/styles/tokens"

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
        "hover:scale-[1.01]",
        accentGlow,
      )}
      style={{ animationDelay: `${delayed}ms` }}
    >
      <CardContent className="flex items-center gap-3 relative z-10 py-2.5">
        <div className={cn("relative flex size-7 shrink-0 items-center justify-center rounded-md", accentBg, accentBorder, "border")}>
          <Icon className={cn("size-3.5", accentColor)} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className={cn("text-sm font-bold tracking-tight tabular-nums leading-none", accentColor)}>
            {value}
          </span>
          {subValue && (
            <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider leading-tight">
              {subValue}
            </span>
          )}
          <span className="text-[10px] font-medium text-foreground/50 tracking-wide leading-tight">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
})

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
    (a) => a.label !== "Routine Check" && a.label !== "Simulation Active"
  ).length

  const deployCost = "89"

  const envStatusLabel = (() => {
    switch (env.state) {
      case "CRITICAL": return "Critical"
      case "ESCALATION": return "Critical"
      case "WARNING": return "Warning"
      case "PRE_WARNING": return "Monitoring"
      case "RECOVERY": return "Stable"
      case "OPTIMIZING": return "Monitoring"
      default: return "Stable"
    }
  })()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <span className="text-[9px] font-mono font-medium tracking-[0.2em] text-emerald-500/60 uppercase">
          Mission Status
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={AlertTriangle}
          label="Environmental Status"
          value={envStatusLabel}
          accentColor={env.color}
          accentBg={env.state === "CRITICAL" ? "bg-red-500/10" : env.state === "WARNING" ? "bg-amber-500/10" : "bg-emerald-500/10"}
          accentBorder={env.state === "CRITICAL" ? "border-red-500/20" : env.state === "WARNING" ? "border-amber-500/20" : "border-emerald-500/20"}
          accentGlow={env.state === "CRITICAL" ? "shadow-[0_0_12px_-4px] shadow-red-500/5" : env.state === "WARNING" ? "shadow-[0_0_12px_-4px] shadow-amber-500/5" : "shadow-[0_0_12px_-4px] shadow-emerald-500/5"}
          delayed={80}
        />

        <StatCard
          icon={rtTel.online ? Wifi : WifiOff}
          label="Active Sensors"
          value={`${activeSensors.length}`}
          subValue={activeSensors.length > 0 ? activeSensors.join(" · ") : "Offline"}
          accentColor={rtTel.online ? "text-blue-500" : "text-muted-foreground/50"}
          accentBg={rtTel.online ? "bg-blue-500/10" : "bg-muted/50"}
          accentBorder={rtTel.online ? "border-blue-500/20" : "border-border/30"}
          accentGlow={rtTel.online ? "shadow-[0_0_12px_-4px] shadow-blue-500/5" : ""}
          delayed={120}
        />

        <StatCard
          icon={Bell}
          label="Active Alerts"
          value={`${activeAlerts}`}
          accentColor={activeAlerts > 0 ? "text-amber-500" : "text-emerald-500"}
          accentBg={activeAlerts > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"}
          accentBorder={activeAlerts > 0 ? "border-amber-500/20" : "border-emerald-500/20"}
          accentGlow={activeAlerts > 0 ? "shadow-[0_0_12px_-4px] shadow-amber-500/5" : "shadow-[0_0_12px_-4px] shadow-emerald-500/5"}
          delayed={160}
        />

        <StatCard
          icon={Heart}
          label="System Health"
          value={`${mem.facilityHealth}%`}
          accentColor={envMeta.color}
          accentBg={envMeta.bg}
          accentBorder={envMeta.border}
          accentGlow={envMeta.glow}
          delayed={200}
        />

        <StatCard
          icon={DollarSign}
          label="Deployment Cost"
          value={`$${deployCost}`}
          subValue="ESP32 + DHT22 + LCD + Power Supply | Prototype Hardware Estimate"
          accentColor="text-violet-500"
          accentBg="bg-violet-500/10"
          accentBorder="border-violet-500/20"
          accentGlow="shadow-[0_0_12px_-4px] shadow-violet-500/5"
          delayed={240}
        />
      </div>
    </div>
  )
})
