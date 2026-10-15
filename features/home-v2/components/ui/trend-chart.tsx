"use client"

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"

import { COPY } from "../../copy"
import type { MetricModel } from "../../data/model"

const W = 320
const H = 140
const PAD = 10
const MIN_POINTS = 3

/**
 * Session trend with a scrubber (pointer or arrow keys). Only plots samples
 * the app actually received this session; with fewer than 3 it says so instead
 * of drawing a line. Marker and guide are HTML so the stretched SVG never
 * distorts them.
 */
export function TrendChart({ metric }: { metric: MetricModel }) {
  const gradientId = useId()
  const surface = useRef<HTMLDivElement>(null)
  const [scrub, setScrub] = useState<number | null>(null)
  const { series, times } = metric
  const count = series.length

  if (count < MIN_POINTS) return null

  const min = Math.min(...series)
  const max = Math.max(...series)
  // Never zoom tighter than minSpan: a 0.4 °C wobble must not look like a swing.
  const span = Math.max(max - min, metric.minSpan)
  const lo = (min + max) / 2 - span / 2
  const x = (i: number) => (i / (count - 1)) * W
  const y = (v: number) => H - PAD - ((v - lo) / span) * (H - PAD * 2)
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ")
  const area = `${line} L${W} ${H} L0 ${H} Z`

  const index = scrub === null ? count - 1 : Math.min(count - 1, Math.max(0, scrub))
  const value = series[index]
  const time = times[index] ?? ""
  const fixed = (v: number) => v.toFixed(metric.decimals)

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = surface.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = (event.clientX - rect.left) / rect.width
    setScrub(Math.round(Math.min(1, Math.max(0, ratio)) * (count - 1)))
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); setScrub(Math.max(0, index - 1)) }
    else if (event.key === "ArrowRight") { event.preventDefault(); setScrub(Math.min(count - 1, index + 1)) }
    else if (event.key === "Home") { event.preventDefault(); setScrub(0) }
    else if (event.key === "End") { event.preventDefault(); setScrub(null) }
  }

  return (
    <div className="hv2-trend-chart" data-metric={metric.id}>
      <div className="hv2-trend-readout" aria-hidden>
        <p className="hv2-trend-value">
          <span className="hv2-trend-number">{fixed(value)}</span>
          <span className="hv2-trend-unit">{metric.unit}</span>
        </p>
        <p className="hv2-trend-time">{scrub === null ? `${COPY.environmentPage.last} · ${time}` : time}</p>
      </div>

      <div
        ref={surface}
        className="hv2-trend-surface"
        role="slider"
        tabIndex={0}
        aria-label={`${metric.label}: ${COPY.environmentPage.trendTitle}`}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        aria-valuetext={`${fixed(value)} ${metric.unit}${time ? `, ${time}` : ""}. ${COPY.environmentPage.min} ${fixed(min)}, ${COPY.environmentPage.max} ${fixed(max)}`}
        onPointerDown={fromPointer}
        onPointerMove={(event) => { if (event.pointerType === "mouse" || event.buttons) fromPointer(event) }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") setScrub(null) }}
        onPointerUp={(event) => { if (event.pointerType !== "mouse") setScrub(null) }}
        onPointerCancel={() => setScrub(null)}
        onBlur={() => setScrub(null)}
        onKeyDown={onKeyDown}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="hv2-trend-svg" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="hv2-trend-grid" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span aria-hidden className="hv2-trend-guide" data-active={scrub !== null || undefined} style={{ left: `${(index / (count - 1)) * 100}%` }} />
        <span aria-hidden className="hv2-trend-marker" style={{ left: `${(index / (count - 1)) * 100}%`, top: `${(y(value) / H) * 100}%` }} />
      </div>

      <div className="hv2-trend-axis" aria-hidden>
        <span>{times[0]}</span>
        <span>{times[count - 1]}</span>
      </div>
      <p className="hv2-trend-range">
        <span>{COPY.environmentPage.min} {fixed(min)} {metric.unit}</span>
        <span>{COPY.environmentPage.max} {fixed(max)} {metric.unit}</span>
      </p>
    </div>
  )
}
