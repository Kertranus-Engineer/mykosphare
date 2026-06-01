"use client"

import { memo, useMemo } from "react"
import { Camera, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { VisualComparison } from "@/lib/visual-analysis/visual-comparison"

function diffColor(value: number): string {
  if (value <= 20) return "text-emerald-500"
  if (value <= 50) return "text-amber-500"
  return "text-red-500"
}

function diffBarColor(value: number): string {
  if (value <= 20) return "bg-emerald-500"
  if (value <= 50) return "bg-amber-500"
  return "bg-red-500"
}

interface VisualProgressTimelineProps {
  comparisons: VisualComparison[]
  captures: ProcessedCapture[]
}

export const VisualProgressTimeline = memo(function VisualProgressTimeline({
  comparisons,
  captures,
}: VisualProgressTimelineProps) {
  const sorted = useMemo(() => {
    return [...captures].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
    )
  }, [captures])

  if (captures.length < 2) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={TrendingDown}
            title="No timeline available"
            description="At least 2 captures are needed to build a visual progress timeline."
          />
        </CardContent>
      </Card>
    )
  }

  const compByCapture = new Map<string, VisualComparison>()
  for (const comp of comparisons) {
    compByCapture.set(comp.imageB, comp)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingDown className="size-4 text-muted-foreground" />
          Visual Progress Timeline
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {captures.length} captures
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col">
          {sorted.map((capture, i) => {
            const comp = compByCapture.get(capture.id)
            const isFirst = i === 0

            return (
              <div key={capture.id} className="relative">
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[9px] font-bold tabular-nums",
                      isFirst ? "bg-muted/30 text-muted-foreground/60" : "bg-muted/20 text-foreground/60",
                    )}>
                      {i + 1}
                    </div>
                    {i < sorted.length - 1 && (
                      <div className="w-px h-5 bg-foreground/5" />
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Camera className="size-2.5 text-muted-foreground/40" />
                      <span className="text-[10px] text-foreground/60 truncate font-mono">
                        {capture.filename.length > 16 ? `${capture.filename.slice(0, 14)}…` : capture.filename}
                      </span>
                    </div>

                    {!isFirst && comp && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", diffBarColor(comp.difference))}
                            style={{ width: `${comp.difference}%` }}
                          />
                        </div>
                        <span className={cn("text-[9px] font-bold tabular-nums shrink-0", diffColor(comp.difference))}>
                          {comp.difference}%
                        </span>
                        <span className="text-[8px] text-muted-foreground/30 tabular-nums shrink-0">
                          {comp.elapsedTimeHours}h
                        </span>
                      </div>
                    )}

                    {isFirst && (
                      <span className="text-[9px] text-muted-foreground/30 italic">
                        Baseline capture
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
