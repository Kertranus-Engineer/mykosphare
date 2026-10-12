"use client"

import { Droplets, Fan } from "lucide-react"

import { cn } from "@/lib/utils"
import type { DataSource } from "../use-mobile-telemetry"

function Chip({ icon: Icon, label, on, simulated, dimmed }: { icon: typeof Fan; label: string; on: boolean; simulated: boolean; dimmed: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3",
        on ? "border-cyan-500/30 bg-cyan-500/10" : "border-border bg-card/70",
        simulated && "border-dashed",
        dimmed && "opacity-60",
      )}
    >
      <Icon className={cn("size-4 shrink-0", on ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-semibold", on ? "text-cyan-700 dark:text-cyan-300" : "text-foreground/70")}>{on ? "Encendido" : "Apagado"}</p>
      </div>
    </div>
  )
}

/** Actuator states reported by the device. Hidden entirely when the stream doesn't include them. */
export function ActuatorChips({ fan, humidifier, source, dimmed = false }: { fan: boolean | null; humidifier: boolean | null; source: DataSource; dimmed?: boolean }) {
  if (fan === null && humidifier === null) return null
  const simulated = source === "simulated"
  return (
    <div className="flex gap-3">
      {fan !== null && <Chip icon={Fan} label="Ventilador" on={fan} simulated={simulated} dimmed={dimmed} />}
      {humidifier !== null && <Chip icon={Droplets} label="Humidificador" on={humidifier} simulated={simulated} dimmed={dimmed} />}
    </div>
  )
}
