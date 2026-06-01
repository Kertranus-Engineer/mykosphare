import {
  ShieldCheck,
  CircleCheck,
  AlertTriangle,
  TrendingUp,
  Minus,
  TrendingDown,
  Cpu,
  Sprout,
  Beaker,
  Layers,
} from "lucide-react"

import type { VisualStatus, GrowthTrend, GrowthStage } from "@/mock/visual-snapshots"

export const STATUS_STYLES: Record<VisualStatus, { badge: string; label: string; icon: typeof ShieldCheck; dot: string; bg: string; text: string }> = {
  healthy: { badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500", label: "Healthy", icon: CircleCheck, dot: "bg-emerald-500", bg: "bg-emerald-500/5", text: "text-emerald-500" },
  warning: { badge: "border-amber-500/20 bg-amber-500/10 text-amber-500", label: "Warning", icon: AlertTriangle, dot: "bg-amber-500", bg: "bg-amber-500/5", text: "text-amber-500" },
  critical: { badge: "border-red-500/20 bg-red-500/10 text-red-500", label: "Critical", icon: ShieldCheck, dot: "bg-red-500", bg: "bg-red-500/5", text: "text-red-500" },
}

export const GROWTH_STYLES: Record<GrowthTrend, { label: string; icon: typeof TrendingUp; color: string; bg: string }> = {
  accelerating: { label: "Accelerating", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  stable: { label: "Stable", icon: Minus, color: "text-sky-500", bg: "bg-sky-500/10" },
  slowing: { label: "Slowing", icon: TrendingDown, color: "text-amber-500", bg: "bg-amber-500/10" },
  unknown: { label: "Unknown", icon: Cpu, color: "text-muted-foreground/50", bg: "bg-muted/30" },
}

export const GROWTH_STAGE_LABELS: Record<GrowthStage, { label: string; icon: typeof Sprout; color: string }> = {
  inoculation: { label: "Inoculation", icon: Beaker, color: "text-blue-400" },
  colonization: { label: "Colonization", icon: Layers, color: "text-emerald-400" },
  consolidation: { label: "Consolidation", icon: Layers, color: "text-emerald-500" },
  primordia: { label: "Primordia", icon: Sprout, color: "text-lime-400" },
  fruiting: { label: "Fruiting", icon: Sprout, color: "text-green-400" },
  harvest: { label: "Harvest", icon: CircleCheck, color: "text-emerald-300" },
}

export const GROWTH_JOURNEY_STAGES: GrowthStage[] = ["inoculation", "colonization", "consolidation", "primordia", "fruiting", "harvest"]

export const GALLERY_PAGE_SIZE = 24
export const TIMELINE_PAGE_SIZE = 50
export const SPARKLINE_MAX_POINTS = 50

export function formatTemp(v: number) { return `${v.toFixed(1)}°C` }
export function formatHumidity(v: number) { return `${v.toFixed(1)}%` }
export function formatCO2(v: number) { return `${v} ppm` }
export function formatDelta(v: number, unit: string, decimals = 1) {
  const s = v > 0 ? `+${v.toFixed(decimals)}` : v.toFixed(decimals)
  return `${s}${unit}`
}

export function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values
  const result: number[] = []
  const step = values.length / maxPoints
  for (let i = 0; i < maxPoints; i++) {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    const bucket = values.slice(start, end)
    result.push(Math.round(bucket.reduce((a, v) => a + v, 0) / bucket.length))
  }
  return result
}

export function confColor(v: number): string {
  return v >= 80 ? "bg-emerald-500/60" : v >= 50 ? "bg-amber-500/60" : "bg-red-500/60"
}
