"use client"

import { Bell, Circle, RefreshCw, Activity } from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { useClock, useScenario } from "@/mock/simulator"
import { cn } from "@/lib/utils"
import { RealtimeBadge } from "@/lib/realtime/status"
import { useRealtimeLogs } from "@/lib/realtime/subscriptions"
import { OperatorDropdown } from "./operator-dropdown"
import { PresentationToggle } from "@/features/presentation/components/presentation-toggle"
import { SystemSnapshot } from "@/features/snapshot/components/system-snapshot"

const BADGE_STYLES: Record<string, string> = {
  STABLE: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
  OPTIMIZING: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  RECOVERY: "bg-teal-500/10 text-teal-500 ring-teal-500/20",
}

const BADGE_GLOW: Record<string, string> = {
  STABLE: "shadow-[0_0_6px_1px] shadow-emerald-500/20",
  OPTIMIZING: "shadow-[0_0_6px_1px] shadow-blue-500/20",
  WARNING: "shadow-[0_0_8px_2px] shadow-amber-500/25",
  RECOVERY: "shadow-[0_0_6px_1px] shadow-teal-500/20",
}

export function AppHeader() {
  const time = useClock()
  const env = useEnvironment()
  const scenario = useScenario()
  const { status: rtStatus, latency } = useRealtimeLogs(1)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Circle className={cn(
            "size-2.5 fill-emerald-500 text-emerald-500 transition-all duration-500",
            env.state === "WARNING" && "fill-amber-500 text-amber-500 animate-pulse",
            env.state === "RECOVERY" && "fill-teal-500 text-teal-500",
            env.state === "STABLE" && "animate-pulse"
          )} />
          <span className={cn(
            "text-xs font-medium transition-all duration-500",
            env.state === "WARNING" ? "text-amber-500" : env.state === "RECOVERY" ? "text-teal-500" : "text-emerald-500"
          )}>
            {scenario ? "SCENARIO" : "ONLINE"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {time}
        </span>
        <div
          className={cn(
            "ml-2 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider ring-1 ring-inset transition-all duration-300",
            BADGE_STYLES[env.state],
            BADGE_GLOW[env.state]
          )}
        >
          {env.label}
        </div>
        <RealtimeBadge status={rtStatus} latency={latency} />
        {scenario && (
          <div className="flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
            <Activity className="size-3 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-medium text-amber-500">{scenario.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PresentationToggle />
        <SystemSnapshot />
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-4" />
        </button>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>
        <OperatorDropdown />
      </div>
    </header>
  )
}
