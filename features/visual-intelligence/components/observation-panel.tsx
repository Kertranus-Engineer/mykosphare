"use client"

import { Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { STATUS_STYLES, confColor } from "@/features/visual-intelligence/utils"

export function ObservationPanel({ snapshot }: { snapshot: VisualSnapshot }) {
  const st = STATUS_STYLES[snapshot.status]
  const StatusIcon = st.icon

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className={cn("flex size-8 items-center justify-center rounded-lg", st.bg)}>
          <StatusIcon className={cn("size-4", st.text)} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{st.label}</span>
          <span className="text-[10px] text-muted-foreground/50">Visual Status Assessment</span>
        </div>
        <span className="ml-auto text-xs font-bold tabular-nums text-foreground/70">{snapshot.confidence}%</span>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em]">Observation</span>
          <p className="text-xs text-foreground/70 leading-relaxed">{snapshot.observation}</p>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="size-3.5 text-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground/50">Confidence</span>
          <div className="ml-auto h-1.5 w-24 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", confColor(snapshot.confidence))} style={{ width: `${snapshot.confidence}%` }} />
          </div>
        </div>
        {snapshot.indicators && snapshot.indicators.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.15em]">Visual Indicators</span>
            <div className="space-y-1">
              {snapshot.indicators.map((ind, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-1 rounded-full shrink-0", st.dot)} />
                  <span className="text-[11px] text-foreground/60">{ind}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
