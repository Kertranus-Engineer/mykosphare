export const OPERATIONAL_STATUS = {
  optimal: { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", bar: "bg-emerald-500", glow: "shadow-[0_0_8px_2px] shadow-emerald-500/30", dot: "bg-emerald-500" },
  stable: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", bar: "bg-blue-500", glow: "shadow-[0_0_8px_2px] shadow-blue-500/30", dot: "bg-blue-500" },
  degraded: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", bar: "bg-amber-500", glow: "shadow-[0_0_8px_2px] shadow-amber-500/30", dot: "bg-amber-500" },
  unstable: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", bar: "bg-orange-500", glow: "shadow-[0_0_8px_2px] shadow-orange-500/30", dot: "bg-orange-500" },
  critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", bar: "bg-red-500", glow: "shadow-[0_0_8px_2px] shadow-red-500/30", dot: "bg-red-500" },
} as const

export const SEVERITY = {
  critical: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", bar: "bg-red-500", dot: "bg-red-500", icon: "text-red-500/70" },
  warning: { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", bar: "bg-amber-500", dot: "bg-amber-500", icon: "text-amber-500/70" },
  info: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", bar: "bg-blue-500", dot: "bg-blue-500", icon: "text-blue-500/70" },
} as const

export const TREND_DIRECTION = {
  rising: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: "text-emerald-500" },
  falling: { color: "text-red-500", bg: "bg-red-500/10", icon: "text-red-500" },
  stable: { color: "text-blue-500", bg: "bg-blue-500/10", icon: "text-blue-500" },
  volatile: { color: "text-amber-500", bg: "bg-amber-500/10", icon: "text-amber-500" },
} as const

export const NODE_STATUS = {
  online: { color: "text-emerald-500", dot: "bg-emerald-500", glow: "shadow-emerald-500/40" },
  offline: { color: "text-red-500", dot: "bg-red-500", glow: "shadow-red-500/40" },
  degraded: { color: "text-amber-500", dot: "bg-amber-500", glow: "shadow-amber-500/40" },
  warning: { color: "text-orange-500", dot: "bg-orange-500", glow: "shadow-orange-500/40" },
  syncing: { color: "text-blue-500", dot: "bg-blue-500", glow: "shadow-blue-500/40" },
  standby: { color: "text-muted-foreground", dot: "bg-muted-foreground", glow: "shadow-muted-foreground/20" },
} as const

export const SCORE_GRADIENT: Record<string, string> = {
  optimal: "from-emerald-500 to-emerald-600",
  stable: "from-blue-500 to-blue-600",
  degraded: "from-amber-500 to-amber-600",
  unstable: "from-orange-500 to-orange-600",
  critical: "from-red-500 to-red-600",
}

export const CARD_HOVER = "transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10"

export function scoreToMeta(score: number): typeof OPERATIONAL_STATUS[keyof typeof OPERATIONAL_STATUS] {
  if (score >= 90) return OPERATIONAL_STATUS.optimal
  if (score >= 75) return OPERATIONAL_STATUS.stable
  if (score >= 55) return OPERATIONAL_STATUS.degraded
  if (score >= 35) return OPERATIONAL_STATUS.unstable
  return OPERATIONAL_STATUS.critical
}

export function severityMeta(severity: string | null): typeof SEVERITY[keyof typeof SEVERITY] {
  if (severity === "critical") return SEVERITY.critical
  if (severity === "warning") return SEVERITY.warning
  return SEVERITY.info
}
