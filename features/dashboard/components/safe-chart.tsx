"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

interface SafeChartProps {
  children: ReactNode
  /** Duration of the sidebar animation in ms (used for debounce delay) */
  debounceMs?: number
}

/**
 * Guards Recharts ResponsiveContainer against rendering with invalid dimensions
 * during sidebar collapse/expand transitions.
 *
 * - Defers chart mount until container width > 0 && height > 0
 * - Debounces resize to match sidebar animation duration
 * - Forces min-width/min-height on the container
 */
export function SafeChart({ children, debounceMs = 250 }: SafeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const w = Math.max(0, rect.width)
      const h = Math.max(0, rect.height)
      setDimensions({ w, h })
    }

    const debouncedMeasure = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(measure, debounceMs)
    }

    const observer = new ResizeObserver(() => {
      debouncedMeasure()
    })

    observer.observe(el)
    measure()

    return () => {
      observer.disconnect()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [debounceMs])

  useEffect(() => {
    if (dimensions.w > 0 && dimensions.h > 0) {
      setReady(true)
    }
  }, [dimensions])

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-w-0 min-h-0"
      style={{ position: "relative" }}
    >
      {ready ? children : null}
    </div>
  )
}

/**
 * Simple min-size guard wrapper for chart containers.
 * Forces min-w-0 min-h-0 and renders children only when the container
 * has positive dimensions.
 */
export function ChartGuard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasSize, setHasSize] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      const rect = el!.getBoundingClientRect()
      setHasSize(rect.width > 0 && rect.height > 0)
    }

    const observer = new ResizeObserver(check)
    observer.observe(el)
    check()

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full h-full min-w-0 min-h-0">
      {hasSize ? children : null}
    </div>
  )
}
