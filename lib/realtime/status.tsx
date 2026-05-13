"use client"

import { cn } from "@/lib/utils"
import type { ConnectionStatus } from "./subscriptions"

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; dot: string; pulse: string }
> = {
  live: {
    label: "LIVE",
    dot: "bg-emerald-500",
    pulse: "shadow-[0_0_6px_1px] shadow-emerald-500/40",
  },
  degraded: {
    label: "DEGRADED",
    dot: "bg-amber-500",
    pulse: "shadow-[0_0_6px_1px] shadow-amber-500/40",
  },
  connecting: {
    label: "CONNECTING",
    dot: "bg-muted-foreground/40",
    pulse: "",
  },
  offline: {
    label: "LOCAL",
    dot: "bg-muted-foreground/20",
    pulse: "",
  },
}

export function RealtimeDot({
  status,
  className,
}: {
  status: ConnectionStatus
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <div
      className={cn(
        "size-1.5 rounded-full transition-all duration-500",
        meta.dot,
        status === "live" ? "animate-pulse" : "",
        meta.pulse,
        className
      )}
    />
  )
}

export function RealtimeBadge({
  status,
  latency,
  className,
}: {
  status: ConnectionStatus
  latency?: number | null
  className?: string
}) {
  const meta = STATUS_META[status]
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2 py-1",
        className
      )}
    >
      <RealtimeDot status={status} />
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground/60">
        {meta.label}
      </span>
      {latency !== null && latency !== undefined && status === "live" && (
        <span className="text-[9px] tabular-nums text-muted-foreground/30">
          {latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  )
}
