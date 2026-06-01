"use client"

import { memo, useState } from "react"
import { MonitorPlay, Radio, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOperationalMode, type OperationalMode } from "@/lib/operational/mode"

const MODE_CONFIG: Record<OperationalMode, { icon: typeof MonitorPlay; label: string; description: string; color: string; bg: string; border: string }> = {
  demo: {
    icon: MonitorPlay,
    label: "Demo",
    description: "Presentation & portfolio mode with simulated data",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  live: {
    icon: Radio,
    label: "Live",
    description: "Real cultivation monitoring with ESP32 telemetry",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  autonomous: {
    icon: Cpu,
    label: "Autonomous",
    description: "Future autonomous pipeline — coming soon",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
}

export const ModeSelector = memo(function ModeSelector() {
  const { mode, setMode } = useOperationalMode()
  const [open, setOpen] = useState(false)

  const current = MODE_CONFIG[mode]
  const Icon = current.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
          current.bg, current.border, current.color,
          "hover:opacity-80",
        )}
      >
        <Icon className="size-3" />
        {current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border/40 bg-card p-1 shadow-xl">
            {(Object.entries(MODE_CONFIG) as [OperationalMode, typeof MODE_CONFIG["demo"]][]).map(([key, cfg]) => {
              const CfgIcon = cfg.icon
              const isActive = mode === key
              const isFuture = key === "autonomous"
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isFuture}
                  onClick={() => {
                    if (!isFuture) {
                      setMode(key)
                      setOpen(false)
                    }
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive ? "bg-muted/40" : "hover:bg-muted/20",
                    isFuture && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <CfgIcon className={cn("size-3.5 mt-0.5 shrink-0", cfg.color)} />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[11px] font-semibold", isActive ? cfg.color : "text-foreground/70")}>
                        {cfg.label}
                      </span>
                      {isActive && <span className="size-1.5 rounded-full bg-current animate-pulse" />}
                      {isFuture && (
                        <span className="text-[9px] font-medium text-muted-foreground/50 rounded border border-border/20 px-1">
                          FUTURE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 leading-tight">
                      {cfg.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
})
