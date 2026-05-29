"use client"

import { useEffect, useRef, useState } from "react"
import { Activity } from "lucide-react"
import { useRealTimeTelemetry } from "@/lib/useTelemetry"

interface EventEntry {
  id: string
  message: string
  ts: number
}

function relativeTime(ts: number): string {
  const sec = Math.round((Date.now() - ts) / 1000)
  if (sec < 10) return "just now"
  if (sec < 60) return `${sec}s ago`
  return `${Math.round(sec / 60)}m ago`
}

let globalCounter = 0

function uid(): string {
  globalCounter++
  return `${Date.now()}-${globalCounter}`
}

export function OperationalNarrative() {
  const rtTel = useRealTimeTelemetry()
  const [events, setEvents] = useState<EventEntry[]>([])
  const prevOnline = useRef(false)
  const prevTemp = useRef(0)
  const prevHum = useRef(0)
  const emitterRef = useRef(false)

  // Guard against strict-mode double-fire: only emit once per deps change
  const depsKey = `${rtTel.online}-${rtTel.temp}-${rtTel.hum}`
  const prevDepsRef = useRef(depsKey)

  useEffect(() => {
    if (prevDepsRef.current === depsKey) return
    prevDepsRef.current = depsKey

    const now = Date.now()

    // Online transition
    if (rtTel.online && !prevOnline.current) {
      setEvents((prev) => [{ id: uid(), message: "Telemetry synchronized", ts: now }, ...prev].slice(0, 8))
    }
    if (!rtTel.online && prevOnline.current) {
      setEvents((prev) => [{ id: uid(), message: "Telemetry interruption", ts: now }, ...prev].slice(0, 8))
    }
    prevOnline.current = rtTel.online

    // Temp spike
    if (rtTel.temp > 28 && prevTemp.current <= 28 && rtTel.temp > 0) {
      setEvents((prev) => [{ id: uid(), message: "Temperature spike detected", ts: now }, ...prev].slice(0, 8))
    }
    // Temp recovery
    if (rtTel.temp <= 28 && prevTemp.current > 28 && rtTel.temp > 0) {
      setEvents((prev) => [{ id: uid(), message: "Thermal stabilization engaged", ts: now }, ...prev].slice(0, 8))
    }
    prevTemp.current = rtTel.temp

    // Hum drop
    if (rtTel.hum < 50 && prevHum.current >= 50 && rtTel.hum > 0) {
      setEvents((prev) => [{ id: uid(), message: "Humidity drop detected", ts: now }, ...prev].slice(0, 8))
    }
    if (rtTel.hum >= 50 && prevHum.current < 50 && rtTel.hum > 0) {
      setEvents((prev) => [{ id: uid(), message: "Humidity levels restored", ts: now }, ...prev].slice(0, 8))
    }
    prevHum.current = rtTel.hum
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey])

  if (events.length === 0) return null

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="size-3 text-muted-foreground/50" />
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground/40 uppercase">
          Operational Narrative
        </span>
      </div>
      <div className="space-y-1">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground/20 shrink-0 tabular-nums">
              {relativeTime(event.ts)}
            </span>
            <span className="text-muted-foreground/50 truncate">
              {event.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
