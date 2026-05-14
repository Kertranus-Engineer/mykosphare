"use client"

import { useMemo } from "react"
import type { SignalLink as SignalLinkType, SignalActivity } from "@/lib/topology/types"
import { cn } from "@/lib/utils"

const LINK_COLORS: Record<string, string> = {
  telemetry: "stroke-emerald-500/30",
  heartbeat: "stroke-blue-500/30",
  control: "stroke-violet-500/30",
  event: "stroke-amber-500/30",
}

const LINK_ACTIVE_COLORS: Record<string, string> = {
  telemetry: "stroke-emerald-500/70",
  heartbeat: "stroke-blue-500/70",
  control: "stroke-violet-500/70",
  event: "stroke-amber-500/70",
}

const LINK_GLOW: Record<string, string> = {
  telemetry: "drop-shadow-[0_0_3px_rgba(16,185,129,0.3)]",
  heartbeat: "drop-shadow-[0_0_3px_rgba(59,130,246,0.3)]",
  control: "drop-shadow-[0_0_3px_rgba(139,92,246,0.3)]",
  event: "drop-shadow-[0_0_3px_rgba(245,158,11,0.3)]",
}

function deterministicOffset(timestamp: number, seed: number): number {
  return ((timestamp * 13 + seed * 7) % 100 - 50) / 50 * 20
}

export function SignalLink({
  link,
  activities,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  link: SignalLinkType
  activities: SignalActivity[]
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}) {
  const matchingActivities = useMemo(
    () => activities.filter((a) => a.linkId === link.id),
    [activities, link.id]
  )

  const isActive = matchingActivities.length > 0 && link.active
  const color = isActive
    ? LINK_ACTIVE_COLORS[link.type] ?? "stroke-muted-foreground/60"
    : LINK_COLORS[link.type] ?? "stroke-muted-foreground/20"

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy)

  const travelActivities = useMemo(() => {
    return matchingActivities.filter((_, i) => i < 2)
  }, [matchingActivities])

  return (
    <g className={cn(isActive && LINK_GLOW[link.type])}>
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        className={cn("transition-all duration-500", color)}
        strokeWidth={isActive ? 1.5 : 1}
        strokeDasharray={isActive ? "none" : "4 3"}
      />

      {isActive && !link.active && (
        <line
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
          className="stroke-emerald-500/20"
          strokeWidth={1}
          strokeDasharray="4 6"
        />
      )}

      {travelActivities.map((a, i) => {
        const progress = ((a.timestamp % 2000) / 2000) * length
        const offset = deterministicOffset(a.timestamp, i + 1)
        const px = sourceX + (dx / length) * ((progress + offset) % length)
        const py = sourceY + (dy / length) * ((progress + offset) % length)

        return (
          <g key={`travel-${a.timestamp}-${a.linkId}`}>
            <circle
              cx={px}
              cy={py}
              r={2.5}
              className={cn(
                "opacity-80",
                a.type === "telemetry"
                  ? "fill-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]"
                  : a.type === "heartbeat"
                    ? "fill-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]"
                    : "fill-violet-500 drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]"
              )}
            />
            <circle
              cx={px}
              cy={py}
              r={5}
              className={cn(
                "opacity-30 animate-ping",
                a.type === "telemetry"
                  ? "fill-emerald-500/30"
                  : a.type === "heartbeat"
                    ? "fill-blue-500/30"
                    : "fill-violet-500/30"
              )}
            />
          </g>
        )
      })}

      {isActive &&
        matchingActivities.slice(0, 2).map((a) => (
          <circle
            key={`${a.timestamp}-${a.linkId}`}
            cx={midX + deterministicOffset(a.timestamp, 1)}
            cy={midY + deterministicOffset(a.timestamp, 2)}
            r={1.5 + a.strength * 2}
            className={cn(
              "opacity-60",
              a.type === "telemetry"
                ? "fill-emerald-500"
                : a.type === "heartbeat"
                  ? "fill-blue-500"
                  : "fill-violet-500"
            )}
          />
        ))}
    </g>
  )
}
