"use client"

import Link from "next/link"
import { ChevronRight, FlaskConical, Radio, SignalZero } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { relativeTimeEs } from "../i18n"
import { sourceTone } from "../tone"
import type { DataSource } from "../use-mobile-telemetry"
import { useNow } from "../use-now"

/** Real vs. simulated data marker. Used wherever a measurement is shown. */
export function DataSourceBadge({ source, className }: { source: DataSource; className?: string }) {
  const tone = sourceTone(source)
  const Icon = source === "live" ? Radio : source === "simulated" ? FlaskConical : SignalZero
  const label = source === "live" ? "Datos reales" : source === "simulated" ? "Simulado" : "Sin datos"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        tone.bg, tone.border, tone.text, className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  )
}

export function RelativeTime({ at, fallback = "—" }: { at: number | string | null; fallback?: string }) {
  const now = useNow(1000)
  if (at === null || now === null) return <span suppressHydrationWarning>{fallback}</span>
  const ms = typeof at === "number" ? at : new Date(at).getTime()
  if (!Number.isFinite(ms)) return <span>{fallback}</span>
  return <span>{relativeTimeEs(ms, now)}</span>
}

export function SectionHeader({
  title,
  action,
  href,
  actionLabel,
}: {
  title: string
  action?: ReactNode
  href?: string
  actionLabel?: string
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      {action}
      {href && (
        <Link
          href={href}
          className="-mr-2 inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 transition-colors active:bg-cyan-500/10"
        >
          {actionLabel ?? "Ver todo"}
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60 motion-reduce:animate-none", className)} aria-hidden />
}

/** Tiny polyline chart over REAL samples only. Renders nothing with < 3 points. */
export function Sparkline({
  values,
  className,
  stroke = "currentColor",
}: {
  values: number[]
  className?: string
  stroke?: string
}) {
  if (values.length < 3) return null
  const w = 100
  const h = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values
    .map((v, i) => `${((i / (values.length - 1)) * w).toFixed(2)},${(h - 2 - ((v - min) / range) * (h - 4)).toFixed(2)}`)
    .join(" ")
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-7 w-full", className)} aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
