"use client"

import { Bell, Circle, RefreshCw } from "lucide-react"

import { useEnvironment } from "@/mock/environment"
import { useClock } from "@/mock/simulator"
import { cn } from "@/lib/utils"
import { RealtimeBadge } from "@/lib/realtime/status"
import { useRealtimeLogs } from "@/lib/realtime/subscriptions"

const BADGE_STYLES: Record<string, string> = {
  STABLE: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
  OPTIMIZING: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
  RECOVERY: "bg-teal-500/10 text-teal-500 ring-teal-500/20",
}

export function AppHeader() {
  const time = useClock()
  const env = useEnvironment()
  const { status: rtStatus, latency } = useRealtimeLogs(1)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Circle className="size-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-500">ONLINE</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {time}
        </span>
        <div
          className={cn(
            "ml-2 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider ring-1 ring-inset transition-all duration-300",
            BADGE_STYLES[env.state]
          )}
        >
          {env.label}
        </div>
        <RealtimeBadge status={rtStatus} latency={latency} />
      </div>

      <div className="flex items-center gap-2">
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
        <button
          type="button"
          className="ml-1 flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/80"
        >
          OP
        </button>
      </div>
    </header>
  )
}
