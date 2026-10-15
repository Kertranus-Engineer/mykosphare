import { useId } from "react"

import { cn } from "@/lib/utils"

const W = 120
const H = 36
const PAD = 3

/**
 * Tiny area chart over real/simulated session samples. Renders nothing with
 * fewer than 3 points (a "trend" of two samples is not a trend). The stroke
 * draws in once on mount (CSS, pathLength=1); later updates just re-render.
 */
export function Sparkline({ values, className, label, minSpan = 0 }: { values: number[]; className?: string; label?: string; minSpan?: number }) {
  const gradientId = useId()
  if (values.length < 3) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, minSpan, 1e-6)
  const lo = (min + max) / 2 - range / 2
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - PAD - ((v - lo) / range) * (H - PAD * 2)
    return [x, y] as const
  })
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")
  const area = `${line} L${W} ${H} L0 ${H} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("hv2-spark", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
