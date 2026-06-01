"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { Camera, Clock, Heart, ImagePlus, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useOperationalMode } from "@/lib/operational/mode"

interface CaptureStatusProps {
  lastCapture?: string | null
  expectedInterval?: number
}

export const CaptureStatus = memo(function CaptureStatus({
  lastCapture,
  expectedInterval = 24,
}: CaptureStatusProps) {
  const { isLive, isDemo } = useOperationalMode()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const stats = useMemo(() => {
    const last = lastCapture ? new Date(lastCapture) : null
    const hoursSince = last
      ? Math.round((now - last.getTime()) / (1000 * 60 * 60))
      : null
    const expected = new Date(now)
    if (last) {
      expected.setTime(last.getTime() + expectedInterval * 60 * 60 * 1000)
    }

    let health: "healthy" | "warning" | "critical" = "healthy"
    if (isLive) {
      if (!last) health = "critical"
      else if (hoursSince !== null && hoursSince > expectedInterval * 1.2) health = "critical"
      else if (hoursSince !== null && hoursSince > expectedInterval) health = "warning"
    }

    return {
      lastLabel: last ? `${last.toLocaleDateString()} ${last.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : null,
      hoursSince,
      expectedLabel: last
        ? `${expected.toLocaleDateString()} ${expected.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : null,
      health,
      healthLabel: health === "healthy" ? "Active" : health === "warning" ? "Delayed" : "Overdue",
    }
  }, [lastCapture, expectedInterval, now, isLive])

  const healthColor = stats.health === "healthy" ? "text-emerald-500" : stats.health === "warning" ? "text-amber-500" : "text-red-500"
  const healthBg = stats.health === "healthy" ? "bg-emerald-500/10" : stats.health === "warning" ? "bg-amber-500/10" : "bg-red-500/10"
  const healthBorder = stats.health === "healthy" ? "border-emerald-500/20" : stats.health === "warning" ? "border-amber-500/20" : "border-red-500/20"
  const healthGlow = stats.health === "healthy" ? "shadow-[0_0_12px_-4px] shadow-emerald-500/5" : stats.health === "warning" ? "shadow-[0_0_12px_-4px] shadow-amber-500/5" : "shadow-[0_0_12px_-4px] shadow-red-500/5"

  if (isDemo) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] shadow-[0_0_12px_-4px] shadow-emerald-500/5 border-emerald-500/20">
          <CardContent className="flex items-center gap-3 py-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <Camera className="size-3.5 text-emerald-500" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight tabular-nums leading-none text-emerald-500">12</span>
              <span className="text-[10px] font-medium text-foreground/50 tracking-wide">Demo Captures</span>
            </div>
          </CardContent>
        </Card>
        <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] shadow-[0_0_12px_-4px] shadow-sky-500/5 border-sky-500/20">
          <CardContent className="flex items-center gap-3 py-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-500/10 border border-sky-500/20">
              <ImagePlus className="size-3.5 text-sky-500" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight tabular-nums leading-none text-sky-500">6</span>
              <span className="text-[10px] font-medium text-foreground/50 tracking-wide">Growth Stages</span>
            </div>
          </CardContent>
        </Card>
        <Card size="sm" className="transition-all duration-300 hover:scale-[1.01] shadow-[0_0_12px_-4px] shadow-violet-500/5 border-violet-500/20">
          <CardContent className="flex items-center gap-3 py-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 border border-violet-500/20">
              <Heart className="size-3.5 text-violet-500" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight tabular-nums leading-none text-violet-500">100%</span>
              <span className="text-[10px] font-medium text-foreground/50 tracking-wide">Dataset Health</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3")}>
      <Card size="sm" className={cn("transition-all duration-300 hover:scale-[1.01]", healthGlow, healthBorder)}>
        <CardContent className="flex items-center gap-3 py-2.5">
          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border", healthBg, healthBorder)}>
            <Camera className={cn("size-3.5", healthColor)} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={cn("text-xs font-bold tracking-tight tabular-nums leading-none", healthColor)}>
              {stats.lastLabel ?? "No capture"}
            </span>
            <span className="text-[10px] font-medium text-foreground/50 tracking-wide">Last Capture</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className={cn("transition-all duration-300 hover:scale-[1.01]", healthGlow, healthBorder)}>
        <CardContent className="flex items-center gap-3 py-2.5">
          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border", healthBg, healthBorder)}>
            <Clock className={cn("size-3.5", healthColor)} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={cn("text-xs font-bold tracking-tight tabular-nums leading-none", healthColor)}>
              {stats.hoursSince !== null ? `Every ${expectedInterval}h` : "—"}
            </span>
            <span className="text-[10px] font-medium text-foreground/50 tracking-wide">Expected Capture</span>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className={cn("transition-all duration-300 hover:scale-[1.01]", healthGlow, healthBorder)}>
        <CardContent className="flex items-center gap-3 py-2.5">
          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border", healthBg, healthBorder)}>
            <Heart className={cn("size-3.5", healthColor)} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={cn("text-xs font-bold tracking-tight tabular-nums leading-none", healthColor)}>
              {stats.healthLabel}
            </span>
            <span className="text-[10px] font-medium text-foreground/50 tracking-wide">Capture Health</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
