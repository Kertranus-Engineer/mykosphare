"use client"

import { Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VisualSnapshot } from "@/mock/visual-snapshots"
import { STATUS_STYLES, GROWTH_STYLES, GROWTH_STAGE_LABELS, confColor } from "@/features/visual-intelligence/utils"

export function HeroAssessment({ snapshot, onClick }: { snapshot: VisualSnapshot; onClick: (s: VisualSnapshot) => void }) {
  const st = STATUS_STYLES[snapshot.status]
  const StatusIcon = st.icon
  const gs = snapshot.growthTrend ? GROWTH_STYLES[snapshot.growthTrend] : null
  const gStage = snapshot.growthStage ? GROWTH_STAGE_LABELS[snapshot.growthStage] : null

  return (
    <Card className={cn("transition-all duration-200 hover:ring-foreground/20 hover:shadow-[0_0_20px_-6px] hover:shadow-foreground/10 cursor-pointer", "border-l-4", snapshot.status === "healthy" ? "border-l-emerald-500/60" : snapshot.status === "warning" ? "border-l-amber-500/60" : "border-l-red-500/60")} onClick={() => onClick(snapshot)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm">Latest Visual Assessment</CardTitle>
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">{snapshot.timestamp}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", st.bg)}>
              <StatusIcon className={cn("size-4", st.text)} />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("h-5 px-2 text-[10px] font-semibold", st.badge)}>{st.label}</Badge>
                {gs && (<span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", gs.bg, gs.color)}><gs.icon className="size-3" />{gs.label}</span>)}
                {gStage && (<span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/30", gStage.color)}><gStage.icon className="size-3" />{gStage.label}</span>)}
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{snapshot.observation}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50">Confidence</span>
            <span className="text-sm font-bold tabular-nums text-foreground">{snapshot.confidence}%</span>
            <div className="ml-auto h-1.5 w-32 rounded-full bg-muted overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", confColor(snapshot.confidence))} style={{ width: `${snapshot.confidence}%` }} />
            </div>
          </div>
          {snapshot.indicators && snapshot.indicators.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {snapshot.indicators.map((ind, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-[10px] text-foreground/60">
                  <span className={cn("size-1 rounded-full", st.dot)} />{ind}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
