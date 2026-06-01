"use client"

import { cn } from "@/lib/utils"
import { CARD_HOVER } from "@/lib/styles/tokens"
import { MODE_COLORS, MODE_BG, MODE_BORDER, MODE_LABELS } from "@/lib/twin/types"
import type { ChamberTwinState, ChamberHealth, OperationalMode } from "@/lib/twin/types"
import type { Command } from "@/lib/commands/types"
import { COMMAND_STATUS_COLORS, COMMAND_STATUS_BG } from "@/lib/commands/types"
import { Gauge, Thermometer, Droplets, Wind, Skull, Heart, Zap, Activity } from "lucide-react"

function ModeBadge({ mode }: { mode: OperationalMode }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", MODE_BG[mode], MODE_COLORS[mode])}>
      {MODE_LABELS[mode]}
    </span>
  )
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"
  const textColor = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-red-500"
  return (
    <div className="flex items-center gap-2">
      <span className={textColor}>{icon}</span>
      <span className="text-[10px] text-muted-foreground/70 w-24">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-[10px] tabular-nums font-medium w-8 text-right", textColor)}>{score}</span>
    </div>
  )
}

export function ChamberTwinCard({ state, health, onSwitchMode }: {
  state: ChamberTwinState
  health: ChamberHealth
  onSwitchMode: (mode: OperationalMode) => void
}) {
  const modes: OperationalMode[] = ["incubation", "fruiting", "sterilization", "maintenance", "emergency"]

  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-4", CARD_HOVER)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-violet-500" />
          <span className="text-sm font-medium text-foreground">{state.chamberId}</span>
          <ModeBadge mode={state.mode} />
        </div>
        <span className={cn("text-lg font-bold tabular-nums", health.overallScore >= 80 ? "text-emerald-500" : health.overallScore >= 60 ? "text-amber-500" : "text-red-500")}>
          {health.overallScore}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <ScoreBar label="Thermal Mass" score={health.thermalScore} icon={<Thermometer className="size-3" />} />
        <ScoreBar label="Humidity" score={health.humidityScore} icon={<Droplets className="size-3" />} />
        <ScoreBar label="Airflow" score={health.airflowScore} icon={<Wind className="size-3" />} />
        <ScoreBar label="Contamination" score={health.contaminationScore} icon={<Skull className="size-3" />} />
        <ScoreBar label="Stress" score={health.stressScore} icon={<Heart className="size-3" />} />
        <ScoreBar label="Energy" score={health.energyScore} icon={<Zap className="size-3" />} />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3 text-[10px]">
        <div className="rounded-md bg-muted/20 px-2 py-1 flex justify-between">
          <span className="text-muted-foreground/60">Cycle</span>
          <span className="text-foreground font-medium">{state.growthCyclePhase}</span>
        </div>
        <div className="rounded-md bg-muted/20 px-2 py-1 flex justify-between">
          <span className="text-muted-foreground/60">Contamination</span>
          <span className={cn("font-medium tabular-nums", state.contaminationRisk > 60 ? "text-red-500" : state.contaminationRisk > 30 ? "text-amber-500" : "text-emerald-500")}>
            {Math.round(state.contaminationRisk)}%
          </span>
        </div>
      </div>

      <div>
        <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-medium">Switch Mode</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onSwitchMode(m)}
              disabled={m === state.mode}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[9px] font-medium transition-colors",
                m === state.mode
                  ? cn(MODE_BG[m], MODE_BORDER[m], MODE_COLORS[m])
                  : "border-border/40 text-muted-foreground/60 hover:bg-muted/30 hover:text-foreground"
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CommandBadgeSmall({ command }: { command: Command }) {
  const color = COMMAND_STATUS_COLORS[command.status]
  const bg = COMMAND_STATUS_BG[command.status]
  return (
    <div className={cn("flex items-center gap-1 rounded-md border px-1.5 py-0.5", bg, color.replace("text-", "border-").replace("500", "500/20"))}>
      <div className={cn("size-1.5 rounded-full", color.replace("text-", "bg-"))} />
      <span className="text-[9px] font-medium">{command.type}</span>
    </div>
  )
}
