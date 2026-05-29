"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Play, Square, AlertTriangle, Thermometer, Heart } from "lucide-react"
import { DEMO_TIMELINE, DEMO_SPEED_MULTIPLIER, type DemoPhase } from "@/lib/demo/demo-timeline"
import { setDemoActive } from "@/lib/useTelemetry"
import { cn } from "@/lib/utils"

const TRIGGERS = [
  { label: "HUMIDITY DRIFT", phase: "WARNING" as DemoPhase, icon: AlertTriangle, color: "hover:border-amber-500/40 hover:text-amber-500" },
  { label: "THERMAL SPIKE", phase: "CRITICAL" as DemoPhase, icon: Thermometer, color: "hover:border-red-500/40 hover:text-red-500" },
  { label: "SYSTEM RECOVERY", phase: "STABILIZED" as DemoPhase, icon: Heart, color: "hover:border-emerald-500/40 hover:text-emerald-500" },
]

async function postDemo(body: Record<string, unknown>) {
  await fetch("/api/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export function AutoDemo() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<DemoPhase | null>(null)
  const [step, setStep] = useState(0)
  const [narrative, setNarrative] = useState("")
  const [presentation, setPresentation] = useState(false)
  const abortRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const findStepByPhase = useCallback((target: DemoPhase) => {
    return DEMO_TIMELINE.findIndex((s) => s.phase === target)
  }, [])

  const triggerPhase = useCallback(async (target: DemoPhase) => {
    abortRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    await new Promise((r) => setTimeout(r, 100))

    const idx = findStepByPhase(target)
    const s = DEMO_TIMELINE[Math.max(0, idx)]
    abortRef.current = false
    setRunning(true)
    setPhase(s.phase)
    setNarrative(s.narrative)

    await postDemo({ action: "start" })
    setDemoActive(true)
    await postDemo({ temp: s.temp, hum: s.hum })

    let i = idx >= 0 ? idx : 0
    while (!abortRef.current) {
      const step = DEMO_TIMELINE[i % DEMO_TIMELINE.length]
      setStep(i)
      setPhase(step.phase)
      setNarrative(step.narrative)
      await postDemo({ temp: step.temp, hum: step.hum })
      await new Promise<void>((resolve) => { timerRef.current = setTimeout(resolve, step.durationMs * DEMO_SPEED_MULTIPLIER) })
      if (abortRef.current) break
      i++
    }
    if (!abortRef.current) stop()
  }, [findStepByPhase])

  async function run() {
    await triggerPhase("NOMINAL")
  }

  function stop() {
    abortRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    setRunning(false)
    setPhase(null)
    setNarrative("")
    setDemoActive(false)
    postDemo({ action: "stop" })
  }

  // Presentation overlay hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return
        setPresentation((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const progress = DEMO_TIMELINE.length > 0 ? Math.round((step / DEMO_TIMELINE.length) * 100) : 0

  return (
    <>
      <div className="flex items-center gap-2">
        {!running ? (
          <>
            <button
              type="button"
              onClick={run}
                className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-emerald-500/80 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-[0_0_14px_-4px] hover:shadow-emerald-500/20 active:scale-[0.98] active:shadow-[0_0_8px_-2px] active:shadow-emerald-500/30 transition-all duration-120 animate-pulse"
            >
              <Play className="size-3" />
              AUTO DEMO
            </button>
            {/* Quick triggers */}
            <span className="text-[9px] text-muted-foreground/20">|</span>
            {TRIGGERS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => triggerPhase(t.phase)}
                className={cn(
                  "flex items-center gap-1 rounded border border-border/30 bg-muted/10 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground/40 transition-all duration-200",
                  t.color
                )}
              >
                <t.icon className="size-2.5" />
                {t.label}
              </button>
            ))}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={stop}
              className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-red-500/80 hover:bg-red-500/10 transition-all duration-200"
            >
              <Square className="size-3" />
              STOP
            </button>
            <span className="text-[10px] font-semibold text-emerald-500/60 tracking-wider tabular-nums">
              {phase}
            </span>
            <span className="text-[10px] text-muted-foreground/50 italic hidden sm:inline truncate max-w-[200px]">
              {narrative}
            </span>
            <span className="text-[10px] text-muted-foreground/30 tabular-nums">
              {progress}%
            </span>
          </>
        )}
      </div>

      {/* Presentation Overlay */}
      {presentation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setPresentation(false)} />
          <div className="relative z-10 rounded-xl border border-emerald-500/20 bg-card/90 backdrop-blur-md px-8 py-6 text-center shadow-[0_0_40px_-10px] shadow-emerald-500/10 pointer-events-auto">
            <h2 className="text-sm font-semibold text-emerald-500 tracking-widest mb-1">MYKOSPHARE</h2>
            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">Environmental Intelligence Platform</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-[10px]">
              <div className="text-muted-foreground/40">Operational State</div>
              <div className="text-emerald-500 font-medium">{phase ?? "NOMINAL"}</div>
              <div className="text-muted-foreground/40">Telemetry Source</div>
              <div className="text-foreground/60">{running ? "SIMULATION" : "ESP32"}</div>
              <div className="text-muted-foreground/40">Demo</div>
              <div className={running ? "text-emerald-500" : "text-muted-foreground/30"}>{running ? "RUNNING" : "IDLE"}</div>
              <div className="text-muted-foreground/40">AI Status</div>
              <div className="text-blue-500/60">ONLINE</div>
            </div>
            <p className="mt-4 text-[9px] text-muted-foreground/20">Press P to toggle</p>
          </div>
        </div>
      )}
    </>
  )
}
