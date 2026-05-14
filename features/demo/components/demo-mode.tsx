"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Play, Square, Activity, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { setScenario, clearScenarioOverride, resetScenarios } from "@/mock/scenarios"
import type { ScenarioType } from "@/mock/scenarios"

const PHASE_INTERVAL = 3500

const DEMO_PHASES: Array<{ label: string; scenario?: ScenarioType; durationMs?: number }> = [
  { label: "INITIALIZING SENSOR SCAN" },
  { label: "ESCALATING HUMIDITY DRIFT", scenario: "humidity-drift", durationMs: PHASE_INTERVAL + 1000 },
  { label: "GENERATING CO₂ SPIKE", scenario: "co2-spike", durationMs: PHASE_INTERVAL + 1000 },
  { label: "TRIGGERING ALERT CASCADE", scenario: "device-offline", durationMs: PHASE_INTERVAL + 1000 },
  { label: "ACTIVATING RECOVERY PROTOCOL", scenario: "recovery-cycle", durationMs: PHASE_INTERVAL + 3000 },
  { label: "STABILIZING ENVIRONMENT", scenario: "recovery-cycle", durationMs: PHASE_INTERVAL + 3000 },
]

export function DemoMode() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const runDemo = useCallback(() => {
    setRunning(true)
    let i = 0
    setPhase(DEMO_PHASES[0].label)

    const entry = DEMO_PHASES[0]
    if (entry.scenario) {
      setScenario(entry.scenario, entry.durationMs)
    }

    intervalRef.current = setInterval(() => {
      i++
      if (i >= DEMO_PHASES.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        clearScenarioOverride()
        setPhase("DEMO COMPLETE")
        timeoutRef.current = setTimeout(() => {
          setRunning(false)
          setPhase(null)
        }, 2000)
        return
      }
      const entry = DEMO_PHASES[i]
      setPhase(entry.label)
      if (entry.scenario) {
        setScenario(entry.scenario, entry.durationMs)
      }
    }, PHASE_INTERVAL)
  }, [])

  const stopDemo = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    clearScenarioOverride()
    resetScenarios()
    setRunning(false)
    setPhase(null)
  }, [])

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg transition-all duration-300",
        running
          ? "border-amber-500/30 shadow-amber-500/10"
          : "border-border/50 hover:border-amber-500/20 hover:shadow-[0_0_20px_-8px] hover:shadow-amber-500/20"
      )}
    >
      {running ? (
        <>
          {phase === "DEMO COMPLETE" ? (
            <RotateCcw className="size-4 text-emerald-500" />
          ) : (
            <Activity className="size-4 text-amber-500 animate-pulse" />
          )}
          <div className="flex flex-col">
            <span className="text-[10px] font-medium tracking-wider text-amber-500">
              DEMO MODE
            </span>
            <span className="text-[11px] text-muted-foreground/70">{phase}</span>
          </div>
          <button
            onClick={stopDemo}
            className="flex size-7 items-center justify-center rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            <Square className="size-3" />
          </button>
        </>
      ) : (
        <button
          onClick={runDemo}
          className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground/70 hover:text-amber-500 transition-colors"
        >
          <Play className="size-3.5" />
          RUN FULL OPERATIONAL SIMULATION
        </button>
      )}
    </div>
  )
}
