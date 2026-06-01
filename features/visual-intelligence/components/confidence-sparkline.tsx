"use client"

import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { downsample, SPARKLINE_MAX_POINTS } from "@/features/visual-intelligence/utils"

export function ConfidenceSparkline({ snapshots }: { snapshots: VisualSnapshot[] }) {
  if (snapshots.length < 2) return null

  const raw = snapshots.map((s) => s.confidence).filter((c) => c > 0)
  const values = downsample(raw, SPARKLINE_MAX_POINTS)
  if (values.length < 2) return null

  const w = 200
  const h = 40
  const pad = 4
  const min = Math.min(...values) - 5
  const max = Math.max(...values) + 5
  const range = max - min
  const xStep = (w - pad * 2) / (values.length - 1)

  const points = values.map((v, i) => {
    const x = pad + i * xStep
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })

  const polyline = points.join(" ")
  const fillPath = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`
  const avg = Math.round(values.reduce((a, v) => a + v, 0) / values.length)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50">Confidence trend across all captures</span>
        <span className="text-[10px] font-medium tabular-nums text-foreground/70">avg {avg}%</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`M${fillPath} Z`} fill="url(#confGrad)" />
        <polyline points={polyline} fill="none" stroke="rgb(16,185,129)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
    </div>
  )
}
