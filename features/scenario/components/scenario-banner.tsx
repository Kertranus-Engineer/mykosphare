"use client"

import { AlertTriangle, Wifi, Droplets, Wind, RotateCcw, Activity } from "lucide-react"
import { useScenario } from "@/mock/simulator"
import { cn } from "@/lib/utils"
import { SEVERITY } from "@/lib/styles/tokens"

const SCENARIO_VISUALS: Record<string, { icon: typeof AlertTriangle; token: keyof typeof SEVERITY }> = {
  "humidity-drift": { icon: Droplets, token: "warning" },
  "intermittent-heartbeat": { icon: Wifi, token: "critical" },
  "co2-spike": { icon: Wind, token: "warning" },
  "device-offline": { icon: Activity, token: "critical" },
  "recovery-cycle": { icon: RotateCcw, token: "info" },
}

export function ScenarioBanner() {
  const scenario = useScenario()

  if (!scenario) return null

  const config = SCENARIO_VISUALS[scenario.type]
  const vis = config ? SEVERITY[config.token] : SEVERITY.info
  const Icon = config?.icon ?? AlertTriangle
  const progress = 1 - scenario.remainingMs / scenario.totalMs

  return (
    <div className={cn("rounded-lg border px-3 py-2 flex items-center gap-3 transition-all duration-300", vis.bg, vis.border)}>
      <Icon className={cn("size-4 shrink-0", vis.color)} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold", vis.color)}>{scenario.label}</span>
          <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-medium">{scenario.severity}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/70 truncate">{scenario.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300", vis.bar)}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground/50 w-12 text-right">
          {Math.ceil(scenario.remainingMs / 1000)}s
        </span>
      </div>
    </div>
  )
}
