"use client"

import { useMemo, memo } from "react"
import type { SignalLink as SignalLinkType, SignalActivity, ConnectionState } from "@/lib/topology/types"

const TYPE_TO_BASE: Record<string, string> = {
  telemetry: "#10b981",
  heartbeat: "#3b82f6",
  control: "#8b5cf6",
  event: "#f59e0b",
}

const STATE_MODIFIERS: Record<ConnectionState, { opacity: number; dash: string; width: number }> = {
  nominal: { opacity: 0.55, dash: "none", width: 1.5 },
  warning: { opacity: 0.45, dash: "4 4", width: 1.2 },
  critical: { opacity: 0.5, dash: "3 3", width: 1.5 },
  offline: { opacity: 0.12, dash: "2 8", width: 0.5 },
}

function hashToOffset(seed: number, t: number): number {
  return (((seed * 7919 + t * 31) % 10000) / 10000)
}

export function SignalLinkImpl({
  link, activities, sourceX, sourceY, targetX, targetY, time, mounted,
}: {
  link: SignalLinkType; activities: SignalActivity[]
  sourceX: number; sourceY: number; targetX: number; targetY: number
  time: number; mounted: boolean
}) {
  const matchingActivities = useMemo(
    () => activities.filter((a) => a.linkId === link.id),
    [activities, link.id]
  )

  const isActive = matchingActivities.length > 0 && link.active
  const baseColor = TYPE_TO_BASE[link.type] ?? "#6b7280"
  const mod = STATE_MODIFIERS[link.connectionState] ?? STATE_MODIFIERS.offline

  const effectiveColor = link.connectionState === "offline" ? "#4b5563" : baseColor
  const effectiveOpacity = isActive ? mod.opacity : mod.opacity * 0.6
  const effectiveDash = isActive && link.connectionState === "nominal" ? "none" : mod.dash

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy)

  const particles = useMemo(() => {
    if (!mounted || length < 10) return []
    const count = isActive ? (link.connectionState === "nominal" ? 3 : link.connectionState === "critical" ? 4 : 2) : 0
    const pts: { key: number; offset: number; size: number }[] = []
    for (let i = 0; i < count; i++) {
      const phase = hashToOffset(i, Math.floor(time / 1000))
      const offset = ((time % 4000) / 4000 + phase) % 1
      pts.push({ key: i, offset, size: 2 + (i % 2) * 1.5 })
    }
    return pts
  }, [time, length, isActive, link.connectionState, mounted])

  return (
    <g>
      {link.connectionState === "offline" ? (
        <line
          x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
          className="stroke-muted-foreground/15"
          strokeWidth={0.5} strokeDasharray="2 8"
        />
      ) : (
        <>
          {isActive && (
            <line
              x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
              stroke={effectiveColor} strokeWidth={mod.width + 6}
              opacity={effectiveOpacity * 0.06} strokeDasharray={effectiveDash}
            />
          )}
          <line
            x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
            stroke={effectiveColor} strokeWidth={mod.width}
            strokeDasharray={effectiveDash}
            opacity={effectiveOpacity * (link.connectionState === "critical" ? 0.5 + Math.sin(time * 0.008) * 0.3 : 1)}
          />
          {isActive && link.connectionState === "nominal" && (
            <line
              x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
              stroke={effectiveColor} strokeWidth={mod.width + 2}
              opacity={effectiveOpacity * 0.15}
            />
          )}
        </>
      )}

      {particles.map((p) => {
        const px = sourceX + dx * p.offset
        const py = sourceY + dy * p.offset
        const particleColor = link.connectionState === "critical" ? "#ef4444"
          : link.connectionState === "warning" ? "#f59e0b" : baseColor

        return (
          <g key={p.key}>
            <defs>
              <radialGradient id={`gl-${link.id}-${p.key}`}>
                <stop offset="0%" stopColor={particleColor} stopOpacity={0.6} />
                <stop offset="100%" stopColor={particleColor} stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle cx={px} cy={py} r={p.size * 3} fill={`url(#gl-${link.id}-${p.key})`} className="opacity-50" />
            <circle cx={px} cy={py} r={p.size} fill={particleColor} className="opacity-90" />
          </g>
        )
      })}

  {isActive &&
        matchingActivities.slice(0, 2).map((a, i) => {
          const midX = (sourceX + targetX) / 2
          const midY = (sourceY + targetY) / 2
          return (
            <circle
              key={`md-${a.timestamp}-${i}`}
              cx={midX + ((a.timestamp * 13 + i * 7) % 100 - 50) / 50 * 15}
              cy={midY + ((a.timestamp * 17 + i * 11) % 100 - 50) / 50 * 15}
              r={1.5 + a.strength * 2}
              className={a.type === "telemetry" ? "fill-emerald-500/60" : a.type === "heartbeat" ? "fill-blue-500/60" : "fill-violet-500/60"}
            />
          )
        })}
    </g>
  )
}

export const SignalLink = memo(SignalLinkImpl)
