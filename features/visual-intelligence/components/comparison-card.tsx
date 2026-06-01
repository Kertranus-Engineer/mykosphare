"use client"

import { ScanEye, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { DeltaBadge } from "@/features/visual-intelligence/components/delta-badge"

export function ComparisonCard({ current, previous }: { current: VisualSnapshot; previous: VisualSnapshot }) {
  const tD = current.temperature - previous.temperature
  const hD = current.humidity - previous.humidity
  const cD = current.co2 - previous.co2

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
        <ScanEye className="size-3.5" />
        Compared with previous capture
        <span className="ml-auto tabular-nums">{previous.timestamp}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/20 p-2">
          <span className="text-[9px] text-muted-foreground/50">Temperature</span>
          <DeltaBadge value={tD} unit="°C" />
        </div>
        <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/20 p-2">
          <span className="text-[9px] text-muted-foreground/50">Humidity</span>
          <DeltaBadge value={hD} unit="%" />
        </div>
        <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/20 p-2">
          <span className="text-[9px] text-muted-foreground/50">CO₂</span>
          <DeltaBadge value={cD} unit=" ppm" decimals={0} />
        </div>
      </div>
      {current.differenceLevel && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
          <Sparkles className="size-3 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/50">Visual Difference</span>
          <span className={cn(
            "ml-auto text-[10px] font-semibold",
            current.differenceLevel === "high" ? "text-amber-500" : current.differenceLevel === "medium" ? "text-sky-500" : "text-emerald-500",
          )}>
            {current.differenceLevel.toUpperCase()}
          </span>
        </div>
      )}
      {current.visualChange && (
        <div className="rounded-lg bg-muted/20 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="size-3 text-muted-foreground/40" />
            <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em]">Visual Change</span>
          </div>
          <p className="text-[11px] text-foreground/70 leading-relaxed">{current.visualChange}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground/50">Comparison Confidence</span>
        <span className="text-xs font-semibold tabular-nums text-foreground/70">{current.confidence}%</span>
      </div>
    </div>
  )
}
