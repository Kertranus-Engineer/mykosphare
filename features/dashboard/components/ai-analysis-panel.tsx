"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Brain, Activity } from "lucide-react"

import { useRealEnvironment } from "@/lib/useEnvironment"
import { useDashboardTelemetry, useRealTimeTelemetry } from "@/lib/useTelemetry"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useEnvironmentalHealth } from "@/lib/operational/environmental-health"

let nowTime = 0
const nowListeners = new Set<() => void>()
let nowRaf = 0
function startNow() {
  if (nowRaf) return
  function tick() { nowTime = Date.now(); nowListeners.forEach((l) => l()); nowRaf = requestAnimationFrame(tick) }
  nowRaf = requestAnimationFrame(tick)
}
function useNow() {
  return useSyncExternalStore(
    (cb) => { nowListeners.add(cb); startNow(); return () => { nowListeners.delete(cb) } },
    () => nowTime,
    () => 0
  )
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t * t }

function computeRawConfidence(
  online: boolean, degraded: boolean, stale: boolean,
  telemetryAge: number, temp: number, hum: number, delta: number
): number {
  if (!online || temp <= 0) return 0
  let score = 100
  if (degraded) score -= 15
  if (stale) score -= 25
  if (telemetryAge > 6000) score -= 10
  if (telemetryAge > 12000) score -= 20
  if (Math.abs(delta) > 2) score -= 5
  if (temp > 32 || hum < 40) score -= 20
  else if (temp > 28 || hum < 50) score -= 10
  return Math.max(0, Math.round(score * 10) / 10)
}

function confidenceColor(score: number): string {
  if (score <= 0) return "text-muted-foreground"
  if (score < 70) return "text-red-500"
  if (score < 85) return "text-amber-500"
  return "text-emerald-500"
}

export function AiAnalysisPanel() {
  const tel = useDashboardTelemetry()
  const rtTel = useRealTimeTelemetry()
  const env = useRealEnvironment()
  const ehi = useEnvironmentalHealth()
  const HealthIcon = env.icon
  const now = useNow()

  const temp = tel.temperature.value
  const hum = tel.humidity.value

  const telemetryAge = useMemo(() => {
    if (!rtTel.updatedAt) return 99999
    return Math.max(0, now - new Date(rtTel.updatedAt).getTime())
  }, [rtTel.updatedAt, now])

  const rawConfidence = useMemo(() =>
    computeRawConfidence(rtTel.online, rtTel.degraded, rtTel.stale, telemetryAge, temp, hum, tel.temperature.delta),
    [rtTel.online, rtTel.degraded, rtTel.stale, telemetryAge, temp, hum, tel.temperature.delta]
  )

  const [displayConfidence, setDisplayConfidence] = useState(rawConfidence)
  const prevRawRef = useRef(rawConfidence)
  const rafRef = useRef(0)

  useEffect(() => {
    const prev = prevRawRef.current
    prevRawRef.current = rawConfidence
    if (prev === rawConfidence) return
    cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const from = prev
    function animate(t: number) {
      const elapsed = t - start
      const progress = Math.min(elapsed / 1500, 1)
      setDisplayConfidence(Math.round(lerp(from, rawConfidence, progress) * 10) / 10)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [rawConfidence])

  return (
    <Card className="transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10">
      <CardHeader className="pb-1">
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-4 text-muted-foreground" />
          AI Analysis
          <span className={cn("ml-auto flex items-center gap-1 text-[9px] font-medium", confidenceColor(displayConfidence))}>
            <Activity className="size-2.5" />
            {displayConfidence > 0 ? `${displayConfidence.toFixed(0)}%` : "--"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-wider w-16 shrink-0">Health</span>
          <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${ehi.score}%`, background: ehi.score >= 70 ? "linear-gradient(90deg, rgba(16,185,129,0.6), rgba(16,185,129,0.3))" : ehi.score >= 40 ? "linear-gradient(90deg, rgba(245,158,11,0.6), rgba(245,158,11,0.3))" : "linear-gradient(90deg, rgba(239,68,68,0.6), rgba(239,68,68,0.3))" }}
            />
          </div>
          <span className={cn("text-[10px] font-bold tabular-nums w-8 text-right", ehi.color)}>{ehi.score}</span>
        </div>
        <div className={cn("flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 ring-1 transition-all duration-500", env.ringColor)}>
          <HealthIcon className={cn("size-7 transition-all duration-500", env.iconColor)} />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{env.headTitle}</span>
            <span className="text-xs text-muted-foreground">{env.headSub}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5 transition-all duration-500">
          <p className="text-xs leading-relaxed text-muted-foreground">{env.aiSummary}</p>
        </div>
      </CardContent>
    </Card>
  )
}
