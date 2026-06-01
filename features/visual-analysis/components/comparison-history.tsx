"use client"

import { memo, useMemo } from "react"
import { History, ArrowDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import type { ProcessedCapture } from "@/lib/capture-processing/types"
import type { VisualComparison } from "@/lib/visual-analysis/visual-comparison"

function similarityColor(value: number): string {
  if (value >= 80) return "text-emerald-500"
  if (value >= 50) return "text-amber-500"
  return "text-red-500"
}

function similarityBarColor(value: number): string {
  if (value >= 80) return "bg-emerald-500"
  if (value >= 50) return "bg-amber-500"
  return "bg-red-500"
}

interface ComparisonHistoryProps {
  comparisons: VisualComparison[]
  captures: ProcessedCapture[]
}

export const ComparisonHistory = memo(function ComparisonHistory({
  comparisons,
  captures,
}: ComparisonHistoryProps) {
  const captureMap = useMemo(() => {
    const map = new Map<string, ProcessedCapture>()
    for (const c of captures) map.set(c.id, c)
    return map
  }, [captures])

  if (comparisons.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={History}
            title="No comparisons"
            description="Visual comparisons are generated between consecutive captures. At least 2 captures are required."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="size-4 text-muted-foreground" />
          Comparison History
          <span className="ml-auto text-[10px] font-normal text-muted-foreground/50 tabular-nums">
            {comparisons.length} pairs
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-foreground/5 max-h-[480px] overflow-y-auto">
          {comparisons.map((comp, i) => {
            const capA = captureMap.get(comp.imageA)
            const capB = captureMap.get(comp.imageB)
            const simWidth = `${comp.similarity}%`

            return (
              <div key={`${comp.imageA}-${comp.imageB}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-[9px] font-mono text-muted-foreground/30 tabular-nums w-5 shrink-0">
                  #{i + 1}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-foreground/60 truncate">
                      {capA?.filename ?? comp.imageA.slice(0, 10)}
                    </span>
                    <ArrowDown className="size-2.5 text-muted-foreground/30 shrink-0" />
                    <span className="text-[10px] text-foreground/60 truncate">
                      {capB?.filename ?? comp.imageB.slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", similarityBarColor(comp.similarity))}
                        style={{ width: simWidth }}
                      />
                    </div>
                    <span className={cn("text-[9px] font-bold tabular-nums shrink-0", similarityColor(comp.similarity))}>
                      {comp.similarity}%
                    </span>
                  </div>
                </div>
                <span className="text-[8px] text-muted-foreground/30 tabular-nums shrink-0">
                  {comp.elapsedTimeHours}h
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
