"use client"

import { useCallback, useRef, useState } from "react"
import { FlaskConical, Square, RotateCcw, Zap, WifiOff, Droplets, Thermometer, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { setDemoActive } from "@/lib/useTelemetry"

type PresetName = "heat_surge" | "sensor_failure" | "humidity_collapse" | "auto_demo"

interface DemoStep { temp: number; hum: number; delay: number; label: string }

const PRESETS: Record<PresetName, { icon: typeof FlaskConical; label: string; totalLabel: string; seq: DemoStep[] }> = {
  heat_surge: {
    icon: Thermometer,
    label: "HEAT",
    totalLabel: "HEAT SURGE",
    seq: [
      { temp: 25.0, hum: 62, delay: 1500, label: "BASELINE" },
      { temp: 28.5, hum: 58, delay: 2500, label: "WARMING" },
      { temp: 31.0, hum: 52, delay: 3000, label: "WARNING" },
      { temp: 33.5, hum: 45, delay: 4000, label: "CRITICAL" },
      { temp: 35.0, hum: 38, delay: 4000, label: "FAN ACTIVE" },
      { temp: 32.0, hum: 42, delay: 3000, label: "COOLING" },
      { temp: 29.0, hum: 50, delay: 2500, label: "RECOVERY" },
      { temp: 26.5, hum: 56, delay: 2000, label: "STABILIZING" },
      { temp: 25.0, hum: 60, delay: 1500, label: "STABLE" },
    ],
  },
  humidity_collapse: {
    icon: Droplets,
    label: "HUMIDITY",
    totalLabel: "HUMIDITY DROP",
    seq: [
      { temp: 25.0, hum: 65, delay: 1500, label: "BASELINE" },
      { temp: 25.5, hum: 58, delay: 2000, label: "DRIFTING" },
      { temp: 26.0, hum: 50, delay: 2500, label: "WARNING" },
      { temp: 26.5, hum: 42, delay: 3000, label: "CRITICAL" },
      { temp: 27.0, hum: 35, delay: 4000, label: "HUM ACTIVE" },
      { temp: 26.5, hum: 45, delay: 2500, label: "RECOVERY" },
      { temp: 26.0, hum: 52, delay: 2000, label: "STABILIZING" },
      { temp: 25.5, hum: 58, delay: 2000, label: "RESTORING" },
      { temp: 25.0, hum: 62, delay: 1500, label: "STABLE" },
    ],
  },
  sensor_failure: {
    icon: WifiOff,
    label: "SENSOR",
    totalLabel: "SENSOR FAILURE",
    seq: [
      { temp: 25.0, hum: 62, delay: 1500, label: "NOMINAL" },
      { temp: 25.2, hum: 61, delay: 2000, label: "TELEMETRY OK" },
      { temp: 0, hum: 0, delay: 6000, label: "SENSOR OFFLINE" },
      { temp: 25.0, hum: 62, delay: 3000, label: "RECONNECTING" },
      { temp: 25.1, hum: 61, delay: 1500, label: "RECOVERED" },
    ],
  },
  auto_demo: {
    icon: Play,
    label: "AUTO",
    totalLabel: "FULL DEMO",
    seq: [
      { temp: 24.8, hum: 62, delay: 2000, label: "STABLE" },
      { temp: 26.0, hum: 60, delay: 2000, label: "NOMINAL" },
      { temp: 28.0, hum: 57, delay: 2500, label: "WARMING" },
      { temp: 29.0, hum: 54, delay: 2500, label: "DRIFT" },
      { temp: 30.5, hum: 50, delay: 3000, label: "WARNING" },
      { temp: 32.0, hum: 46, delay: 3500, label: "CRITICAL" },
      { temp: 34.0, hum: 40, delay: 4000, label: "FAN ON" },
      { temp: 33.0, hum: 38, delay: 3000, label: "COOLING" },
      { temp: 31.0, hum: 42, delay: 2500, label: "DECREASING" },
      { temp: 29.0, hum: 48, delay: 2500, label: "RECOVERY" },
      { temp: 27.0, hum: 53, delay: 2000, label: "STABILIZING" },
      { temp: 25.5, hum: 58, delay: 2000, label: "NORMALIZING" },
      { temp: 24.8, hum: 61, delay: 2000, label: "STABLE" },
    ],
  },
}

export function DemoTrigger() {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(-1)
  const [currentLabel, setCurrentLabel] = useState("")
  const [presetName, setPresetName] = useState<PresetName | null>(null)
  const abortRef = useRef(false)

  const stopAll = useCallback(() => {
    abortRef.current = true
    setRunning(false)
    setStep(-1)
    setPresetName(null)
    setCurrentLabel("")
    setDemoActive(false)
    fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    })
  }, [])

  const runPreset = useCallback(async (name: PresetName) => {
    if (running) return
    abortRef.current = false
    setRunning(true)
    setPresetName(name)
    setDemoActive(true)

    const preset = PRESETS[name]

    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    })

    for (let i = 0; i < preset.seq.length; i++) {
      if (abortRef.current) break
      const { temp, hum, delay, label } = preset.seq[i]
      setStep(i)
      setCurrentLabel(label)
      try {
        await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ temp, hum }),
        })
      } catch {
        break
      }
      await new Promise((r) => setTimeout(r, delay))
    }

    if (!abortRef.current) {
      stopAll()
    }
  }, [running, stopAll])

  const progress = step >= 0 && presetName ? Math.round((step / PRESETS[presetName].seq.length) * 100) : 0

  if (running) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={stopAll}
          className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-red-500 hover:bg-red-500/20 transition-colors"
        >
          <Square className="size-3" />
          STOP
        </button>
        <span className="text-[10px] font-semibold text-amber-500 tracking-wider">
          {currentLabel}
        </span>
        <span className="text-[10px] font-medium text-amber-500/60 tabular-nums">
          {progress}%
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => runPreset("auto_demo")}
        className="flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] font-semibold tracking-wide text-emerald-500/80 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200"
      >
        <Play className="size-3" />
        AUTO DEMO
      </button>
      <button
        type="button"
        onClick={() => runPreset("heat_surge")}
        className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground/60 hover:border-red-500/30 hover:text-red-500 hover:bg-red-500/5 transition-all"
      >
        <Thermometer className="size-3" />
        HEAT
      </button>
      <button
        type="button"
        onClick={() => runPreset("humidity_collapse")}
        className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground/60 hover:border-amber-500/30 hover:text-amber-500 hover:bg-amber-500/5 transition-all"
      >
        <Droplets className="size-3" />
        HUM
      </button>
      <button
        type="button"
        onClick={() => runPreset("sensor_failure")}
        className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground/60 hover:border-amber-500/30 hover:text-amber-500 hover:bg-amber-500/5 transition-all"
      >
        <WifiOff className="size-3" />
        FAIL
      </button>
      <button
        type="button"
        onClick={stopAll}
        className="flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground/60 hover:border-emerald-500/30 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all"
      >
        <RotateCcw className="size-3" />
        LIVE
      </button>
    </div>
  )
}
