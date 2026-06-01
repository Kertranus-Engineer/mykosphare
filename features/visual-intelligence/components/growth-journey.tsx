"use client"

import { Sprout } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { GrowthStage } from "@/mock/visual-snapshots"
import { GROWTH_STAGE_LABELS, GROWTH_JOURNEY_STAGES } from "@/features/visual-intelligence/utils"

export function GrowthJourney({ currentStage }: { currentStage: GrowthStage | undefined }) {
  const stages = GROWTH_JOURNEY_STAGES
  const currentIdx = currentStage ? stages.indexOf(currentStage) : -1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sprout className="size-4 text-muted-foreground" />
          Growth Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            {stages.map((stage, i) => {
              const info = GROWTH_STAGE_LABELS[stage]
              const Icon = info.icon
              const isPast = i < currentIdx
              const isCurrent = i === currentIdx
              const isFuture = i > currentIdx

              return (
                <div key={stage} className="flex items-center gap-1 min-w-0 shrink-0">
                  {i > 0 && (
                    <div className={cn("w-4 h-px shrink-0", isPast ? "bg-emerald-500/60" : "bg-muted/40")} />
                  )}
                  <div className={cn(
                    "flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors",
                    isCurrent && "bg-emerald-500/10 ring-1 ring-emerald-500/20",
                    isPast && "opacity-80",
                    isFuture && "opacity-40",
                  )}>
                    <div className={cn(
                      "flex size-7 items-center justify-center rounded-full",
                      isPast ? "bg-emerald-500/20 text-emerald-500" :
                      isCurrent ? "bg-emerald-500/30 text-emerald-400" :
                      "bg-muted/20 text-muted-foreground/40",
                    )}>
                      <Icon className="size-3.5" />
                    </div>
                    <span className={cn(
                      "text-[9px] font-medium text-center whitespace-nowrap",
                      isCurrent ? "text-emerald-400" :
                      isPast ? "text-emerald-500/70" :
                      "text-muted-foreground/40",
                    )}>
                      {info.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[8px] text-emerald-400/60 font-medium">CURRENT</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {currentStage && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
              <span className="text-[10px] text-muted-foreground/50">Active stage:</span>
              <span className={cn("text-xs font-semibold", GROWTH_STAGE_LABELS[currentStage].color)}>
                {GROWTH_STAGE_LABELS[currentStage].label}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
