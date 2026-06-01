"use client"

import { memo } from "react"
import { Thermometer, Droplets, Hash, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { SnapshotThumb } from "@/features/visual-intelligence/components/snapshot-thumb"
import { formatTemp, formatHumidity, formatCO2, STATUS_STYLES } from "@/features/visual-intelligence/utils"

export const TimelineRow = memo(function TimelineRow({ snapshot, onView }: { snapshot: VisualSnapshot; onView: (s: VisualSnapshot) => void }) {
  const st = STATUS_STYLES[snapshot.status]

  return (
    <button type="button" onClick={() => onView(snapshot)} className="flex items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/30 w-full focus:outline-none">
      <div className="shrink-0 w-14 aspect-[4/3] rounded-md overflow-hidden relative">
        <SnapshotThumb imageUrl={snapshot.imageUrl} className="absolute inset-0" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground/50">{snapshot.timestamp}</span>
          <Badge variant="outline" className={cn("h-4 px-1 text-[8px] font-medium", st.badge)}>{st.label}</Badge>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1"><Thermometer className="size-2.5 text-amber-500/60" />{formatTemp(snapshot.temperature)}</span>
          <span className="flex items-center gap-1"><Droplets className="size-2.5 text-cyan-500/60" />{formatHumidity(snapshot.humidity)}</span>
          <span className="flex items-center gap-1"><Hash className="size-2.5 text-slate-500/60" />{formatCO2(snapshot.co2)}</span>
        </div>
        <p className="text-[10px] text-foreground/60 leading-relaxed line-clamp-2 mt-0.5">{snapshot.observation}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-xs font-semibold tabular-nums text-foreground/60">{snapshot.confidence}%</span>
        <span className="text-[9px] text-muted-foreground/40">conf</span>
      </div>
      <ChevronRight className="size-3 text-muted-foreground/30 self-center" />
    </button>
  )
})
