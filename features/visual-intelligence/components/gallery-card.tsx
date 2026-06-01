"use client"

import { memo } from "react"
import { Thermometer, Droplets, Hash, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { SnapshotThumb } from "@/features/visual-intelligence/components/snapshot-thumb"
import { formatTemp, formatHumidity, formatCO2, STATUS_STYLES } from "@/features/visual-intelligence/utils"

export const GalleryCard = memo(function GalleryCard({ snapshot, onView, isSelected }: { snapshot: VisualSnapshot; index: number; onView: (s: VisualSnapshot) => void; isSelected: boolean }) {
  const st = STATUS_STYLES[snapshot.status]
  return (
    <button type="button" onClick={() => onView(snapshot)} className="group/snap w-full text-left focus:outline-none">
      <Card className={cn("cursor-pointer transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_16px_-6px] hover:shadow-foreground/10 hover:scale-[1.01]", isSelected && "ring-2 ring-foreground/30 shadow-[0_0_16px_-6px] shadow-foreground/10")}>
        <div className="relative overflow-hidden rounded-t-xl aspect-[4/3]">
          <SnapshotThumb imageUrl={snapshot.imageUrl} className="rounded-none absolute inset-0" />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover/snap:opacity-100 transition-opacity duration-200 p-2.5">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-[9px] text-white/80"><Thermometer className="size-2.5" />{formatTemp(snapshot.temperature)}</div>
              <div className="flex items-center gap-1 text-[9px] text-white/80"><Droplets className="size-2.5" />{formatHumidity(snapshot.humidity)}</div>
              <div className="flex items-center gap-1 text-[9px] text-white/80"><Hash className="size-2.5" />{formatCO2(snapshot.co2)}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[8px] font-medium text-white/90">{st.label}</span>
                <span className="text-[8px] text-white/60">{snapshot.confidence}%</span>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="flex flex-col gap-2 pt-3">
          <div className="flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground/50"><Clock className="size-3" />{snapshot.timestamp}</div>
          <div className="grid grid-cols-3 gap-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70"><Thermometer className="size-3 text-amber-500/70" />{formatTemp(snapshot.temperature)}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70"><Droplets className="size-3 text-cyan-500/70" />{formatHumidity(snapshot.humidity)}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70"><Hash className="size-3 text-slate-500/70" />{formatCO2(snapshot.co2)}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("h-4.5 px-1.5 text-[9px] font-medium", st.badge)}>{st.label}</Badge>
            <span className="text-[9px] text-muted-foreground/40">{snapshot.confidence}%</span>
          </div>
        </CardContent>
      </Card>
    </button>
  )
})
