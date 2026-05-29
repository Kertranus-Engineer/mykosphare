"use client"

import { memo, useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

const MetricValue = memo(function MetricValue({
  value,
  unit,
  decimals,
  color,
  minWidth,
}: {
  value: number
  unit: string
  decimals: number
  color: string
  minWidth: string
}) {
  const [display, setDisplay] = useState(value)
  const rafRef = useRef<number>(0)
  const targetRef = useRef(value)
  const prevRef = useRef(value)

  useEffect(() => {
    if (targetRef.current === value) return
    const diff = Math.abs(value - prevRef.current)
    prevRef.current = display
    targetRef.current = value

    cancelAnimationFrame(rafRef.current)

    if (diff < 0.3 || value === 0) {
      setDisplay(value)
      return
    }

    const start = performance.now()
    const from = prevRef.current

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / 300, 1)
      const eased = 1 - Math.pow(1 - progress, 2)
      setDisplay(Math.round(lerp(from, value, eased) * Math.pow(10, decimals)) / Math.pow(10, decimals))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals])

  const formatted = value > 0 ? `${display.toFixed(decimals)}` : "--"

  return (
    <span
      className="inline-block font-bold tracking-tight tabular-nums"
      style={{
        color,
        minWidth,
        fontVariantNumeric: "tabular-nums",
        fontSize: "2.25rem",
        lineHeight: "normal",
        textShadow: value > 0 ? "0 0 14px rgba(16,185,129,0.06)" : "none",
        fontWeight: 700,
      }}
    >
      {formatted}
      {value > 0 && (
        <span className="text-[0.55em] font-normal text-foreground/40 ml-[0.15em]">{unit}</span>
      )}
    </span>
  )
})

const TrendBadge = memo(function TrendBadge({
  trend,
  delta,
  unit,
  live,
}: {
  trend: "up" | "down" | "stable"
  delta: number
  unit: string
  live: boolean
}) {
  if (trend === "stable" || !live) return null
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown
  const color = trend === "up" ? "text-emerald-500" : "text-red-500"
  return (
    <div className={cn("flex items-center gap-1 text-sm", color)}>
      <TrendIcon className="size-3.5" />
      <span className="font-medium tabular-nums">
        {delta >= 0 ? "+" : ""}{delta.toFixed(1)}{unit}
      </span>
    </div>
  )
})

const LiveDot = memo(function LiveDot({ critical, warning }: { critical: boolean; warning: boolean }) {
  return (
    <div className="absolute -right-0.5 -top-0.5">
      <div className={cn(
        "size-2 rounded-full animate-pulse",
        critical ? "bg-red-500" : warning ? "bg-amber-500" : "bg-emerald-500"
      )} />
    </div>
  )
})

export interface MetricCardProps {
  icon: LucideIcon
  label: string
  value: number
  unit: string
  decimals: number
  trend: "up" | "down" | "stable"
  delta: number
  live?: boolean
  warning?: boolean
  critical?: boolean
  minWidth?: string
}

export const MetricCard = memo(function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  decimals,
  trend,
  delta,
  live = true,
  warning = false,
  critical = false,
  minWidth = "120px",
}: MetricCardProps) {
  const kpiColor = critical ? "#ef4444" : warning ? "#f59e0b" : "var(--kpi-value)"
  const iconColor = critical ? "text-red-500" : warning ? "text-amber-500" : "text-foreground/60"
  const isLive = live && value > 0

  return (
    <Card
      size="sm"
      className={cn(
        "flex-1 transition-all duration-300 relative overflow-hidden",
        "hover:ring-foreground/20 hover:shadow-[0_0_20px_-8px] hover:shadow-foreground/10",
        critical && "ring-1 ring-red-500/20 shadow-[0_0_16px_-4px] shadow-red-500/10",
        warning && "ring-1 ring-amber-500/10 shadow-[0_0_12px_-4px] shadow-amber-500/10",
        live && !critical && !warning && "shadow-[0_0_12px_-4px] shadow-emerald-500/5"
      )}
    >
      {isLive && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              critical ? "rgba(239,68,68,0.15)" : warning ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.10)"
            }, transparent)`,
            animation: "sweep-line 4s ease-in-out infinite",
          }}
        />
      )}
      <CardContent className="flex flex-col gap-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="relative flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className={cn("size-[20px] transition-all duration-300", iconColor)} />
            {isLive && <LiveDot critical={critical} warning={warning} />}
          </div>
          <div className="flex items-center gap-1.5">
            <TrendBadge trend={trend} delta={delta} unit={unit} live={isLive} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <MetricValue value={value} unit={unit} decimals={decimals} color={kpiColor} minWidth={minWidth} />
          <span className="text-[13px] font-medium text-foreground/55 tracking-wide">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}, (prev, next) => {
  return (
    prev.value === next.value &&
    prev.trend === next.trend &&
    prev.delta === next.delta &&
    prev.warning === next.warning &&
    prev.critical === next.critical
  )
})
