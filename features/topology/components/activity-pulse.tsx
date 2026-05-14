"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface Pulse {
  id: number
  x: number
  y: number
  strength: number
  type: "telemetry" | "heartbeat" | "control" | "event"
}

const PULSE_COLORS: Record<string, string> = {
  telemetry: "border-emerald-500/40",
  heartbeat: "border-blue-500/40",
  control: "border-violet-500/40",
  event: "border-amber-500/40",
}

export function ActivityPulse({ pulse }: { pulse: Pulse }) {
  const [visible, setVisible] = useState(true)
  const color = PULSE_COLORS[pulse.type] ?? "border-muted-foreground/40"

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 800)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className={cn(
        "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
        color
      )}
      style={{
        left: pulse.x,
        top: pulse.y,
        width: 16 + pulse.strength * 20,
        height: 16 + pulse.strength * 20,
        animation: "pulse-out 0.8s ease-out forwards",
      }}
    />
  )
}
