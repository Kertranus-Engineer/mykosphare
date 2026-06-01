"use client"

import { Microscope, X, Thermometer, Droplets, Hash, Clock, Brain, ScanEye, Sparkles, Sprout } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { DeltaBadge } from "@/features/visual-intelligence/components/delta-badge"
import { SnapshotThumb } from "@/features/visual-intelligence/components/snapshot-thumb"
import { formatTemp, formatHumidity, formatCO2, confColor, STATUS_STYLES, GROWTH_STYLES, GROWTH_STAGE_LABELS } from "@/features/visual-intelligence/utils"

export function SnapshotViewer({ snapshot, previousSnapshot, onClose }: { snapshot: VisualSnapshot; previousSnapshot: VisualSnapshot | null; onClose: () => void }) {
  const st = STATUS_STYLES[snapshot.status]
  const gs = snapshot.growthTrend ? GROWTH_STYLES[snapshot.growthTrend] : null
  const gStage = snapshot.growthStage ? GROWTH_STAGE_LABELS[snapshot.growthStage] : null
  const StageIcon = gStage?.icon ?? Sprout
  const hasPrior = previousSnapshot !== null
  const tD = hasPrior ? snapshot.temperature - previousSnapshot.temperature : 0
  const hD = hasPrior ? snapshot.humidity - previousSnapshot.humidity : 0
  const cD = hasPrior ? snapshot.co2 - previousSnapshot.co2 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="relative rounded-xl bg-card ring-1 ring-foreground/10 shadow-2xl overflow-hidden w-full max-w-5xl max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Microscope className="size-4 text-emerald-500/60 shrink-0" />
            <p className="text-xs font-semibold text-foreground truncate">Inspection Report — {snapshot.id}</p>
            <span className="text-[10px] tabular-nums text-muted-foreground/50 shrink-0">{snapshot.timestamp}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {gs && (<span className={cn("hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", gs.bg, gs.color)}><gs.icon className="size-3" />{gs.label}</span>)}
            <Badge variant="outline" className={cn("h-5 px-2 text-[10px] font-semibold", st.badge)}>{st.label}</Badge>
            <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-full bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-49px)]">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Image panel */}
            <div className="lg:col-span-3 relative aspect-video bg-black/30">
              <SnapshotThumb imageUrl={snapshot.imageUrl} className="absolute inset-0" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="rounded-md bg-black/50 px-2.5 py-1 text-[10px] text-white/80 font-medium backdrop-blur-sm">{snapshot.id}</span>
                {snapshot.growthStage && (
                  <span className="rounded-md bg-black/50 px-2.5 py-1 text-[10px] text-white/80 font-medium backdrop-blur-sm flex items-center gap-1">
                    <StageIcon className="size-3" />
                    {GROWTH_STAGE_LABELS[snapshot.growthStage].label}
                  </span>
                )}
              </div>
            </div>

            {/* Inspection data panel */}
            <div className="lg:col-span-2 flex flex-col gap-4 p-5 bg-card border-l border-foreground/5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <Brain className="size-3" />AI Assessment
                </span>
                <p className="text-sm text-foreground/80 leading-relaxed">{snapshot.observation}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">Confidence</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-foreground">{snapshot.confidence}%</span>
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full rounded-full", confColor(snapshot.confidence))} style={{ width: `${snapshot.confidence}%` }} />
                    </div>
                  </div>
                </div>

                {snapshot.growthStage && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/50">Growth Stage</span>
                    <span className={cn("text-xs font-medium flex items-center gap-1.5", GROWTH_STAGE_LABELS[snapshot.growthStage].color)}>
                      <StageIcon className="size-3" />
                      {GROWTH_STAGE_LABELS[snapshot.growthStage].label}
                    </span>
                  </div>
                )}

                {snapshot.growthPercent !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/50">Growth Progress</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-foreground">{snapshot.growthPercent}%</span>
                      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400" style={{ width: `${snapshot.growthPercent}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-foreground/5 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/50 flex items-center gap-1.5"><Thermometer className="size-3 text-amber-500/60" />Temperature</span>
                  <span className="font-mono text-foreground/70">{formatTemp(snapshot.temperature)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/50 flex items-center gap-1.5"><Droplets className="size-3 text-cyan-500/60" />Humidity</span>
                  <span className="font-mono text-foreground/70">{formatHumidity(snapshot.humidity)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/50 flex items-center gap-1.5"><Hash className="size-3 text-slate-500/60" />CO₂</span>
                  <span className="font-mono text-foreground/70">{formatCO2(snapshot.co2)}</span>
                </div>
              </div>

              <div className="border-t border-foreground/5 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/50 flex items-center gap-1.5"><Clock className="size-3" />Timestamp</span>
                  <span className="font-mono text-foreground/70 text-[10px]">{snapshot.timestamp}</span>
                </div>
              </div>

              {hasPrior && (
                <div className="border-t border-foreground/5 pt-3">
                  <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground/50">
                    <ScanEye className="size-3" />
                    Compared with {previousSnapshot.id}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-0.5 rounded bg-muted/20 p-2">
                      <span className="text-[9px] text-muted-foreground/40">Δ Temp</span>
                      <DeltaBadge value={tD} unit="°C" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 rounded bg-muted/20 p-2">
                      <span className="text-[9px] text-muted-foreground/40">Δ Hum</span>
                      <DeltaBadge value={hD} unit="%" />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 rounded bg-muted/20 p-2">
                      <span className="text-[9px] text-muted-foreground/40">Δ CO₂</span>
                      <DeltaBadge value={cD} unit=" ppm" decimals={0} />
                    </div>
                  </div>
                  {snapshot.visualChange && (
                    <div className="mt-3 flex items-start gap-2 rounded bg-muted/20 p-2.5">
                      <Sparkles className="size-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-foreground/60 leading-relaxed">{snapshot.visualChange}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
