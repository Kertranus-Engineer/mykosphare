"use client"

import { memo } from "react"
import { Cpu, Zap, Camera, Activity, Bot, Brain, Settings } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const STAGES = [
  { icon: Camera, label: "Visual Analysis", desc: "Image processing & growth detection" },
  { icon: Activity, label: "Telemetry Analysis", desc: "Sensor data interpretation" },
  { icon: Brain, label: "Decision Engine", desc: "AI-driven action planning" },
  { icon: Zap, label: "ESP32 Commands", desc: "Actuator control dispatch" },
]

export const AutonomousPlaceholder = memo(function AutonomousPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20">
          <Cpu className="size-8 text-violet-500/60" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-lg font-semibold tracking-tight text-violet-400">Autonomous Mode</h2>
          <p className="text-sm text-muted-foreground/50 max-w-md text-center">
            This pipeline will enable fully automated cultivation monitoring, analysis, and control. Currently in development.
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <Card size="sm" className="border-violet-500/10 shadow-[0_0_20px_-8px] shadow-violet-500/10">
          <CardContent className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-violet-500/60" />
              <span className="text-xs font-semibold tracking-tight text-violet-400">Future Pipeline</span>
            </div>

            <div className="flex items-center gap-2">
              {STAGES.map((stage, idx, arr) => (
                <div key={stage.label} className="flex items-center gap-1.5 flex-1">
                  <div className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-lg bg-violet-500/5 border border-violet-500/10 px-2 py-3 text-center transition-colors hover:bg-violet-500/10",
                  )}>
                    <stage.icon className="size-4 text-violet-500/30" />
                    <span className="text-[9px] font-semibold text-violet-400/60 leading-tight">{stage.label}</span>
                    <span className="text-[8px] text-muted-foreground/30 leading-tight">{stage.desc}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="h-px flex-[0.2] bg-gradient-to-r from-violet-500/20 to-violet-500/5" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 rounded-lg bg-violet-500/5 border border-violet-500/10 px-4 py-3">
              <Settings className="size-4 text-violet-500/40 animate-spin" style={{ animationDuration: "3s" }} />
              <span className="text-xs font-medium text-violet-400/60">Future capability — coming soon</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
